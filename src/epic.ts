import { Action } from "redux-actions"
import { Observable } from "rxjs"
import 'rxjs/add/operator/map'
import { combineEpics, ActionsObservable } from 'redux-observable'
import * as Paho from "paho"
import {
  Kii, KiiUser, KiiGroup, KiiTopic, KiiPushMessageBuilder, KiiPushMessage, KiiMqttEndpoint, KiiQuery,
} from "kii-sdk"
import { connect, disconnect, connectionLost, messageArrived, connectionAlive, refresh } from "./action"

Kii.setAccessTokenExpiration(3600 * 24 /* sec */);

namespace Epic {

  type ToPromise<P, S, R> = <P, S, R>(a: Action<P>, s: Redux.Store<S>) => Promise<R>

  export const fromPromise = <P, S, R>(type: string, genPromise: ToPromise<P, S, R>) =>
    (a: ActionsObservable<P>, store: Redux.Store<S>) => a.ofType(type)
      .mergeMap(action => Observable.fromPromise(genPromise(action, store)
        .catch(err => ({
          type: `${type}.rejected`,
          payload: err,
          error: true,
        }))))
      .map((e: Action<P> & P) => (e.error ? e: {type: `${type}.resolved`, payload: e}))

}

const signUpEpic = Epic.fromPromise(
  "SIGN-UP",
  ({ payload: { username, password } }: Action<SignUpPayload>) =>
    KiiUser.userWithUsername(username, password)
      .register()
      .then(me => ({me}))
)

function isTokenPayload(payload: SignInPayload): payload is TokenPayload {
  return (<TokenPayload>payload).token !== undefined;
}

const signInEpic = combineEpics(
  Epic.fromPromise(
    "SIGN-IN",
    ({ payload }: Action<SignInPayload>) =>
      (isTokenPayload(payload)
        ? KiiUser.authenticateWithToken(payload.token)
        : KiiUser.authenticate(payload.username, payload.password))
        .then(u => u.memberOfGroups())
        .then(([me, groups]) => ({me, groups}))
  ),

  (a: ActionsObservable<{}>) =>
    a.ofType("SIGN-IN.rejected")
    .map(_ => removeToken())
)

const signOutEpic = (a: ActionsObservable<{}>, store: Redux.Store<{kiicloud: KiiCloudState}>) =>
  a.ofType("SIGN-OUT").map(_ => disconnect(store.getState().kiicloud))

function join(token: string): Promise<SignInResolvedPayload> {
  return Kii.serverCodeEntry("join").execute({token})
    .then(([a, b, r]) => r.getReturnedValue().returnedValue)
    .then(v => {
      if (v.error)
        throw new Error(v.error)
      if (v.statusText === "error")
        throw new Error(v.responseJSON.message)
      return v
    })
    .then(({ login, groups }) => Promise.all([
      KiiUser.findUserByUsername(login),
      Promise.all(groups.map((g: string) => KiiGroup.groupWithID(g).refresh())),
    ]))
    .then(([me, groups]) => ({me, groups}))
}

const joinEpic = Epic.fromPromise(
  'JOIN',
  ({ payload }: Action<JoinPayload>) => join(payload.github_token)
)

function getMQTTEndpoint(sender: KiiUser): Promise<KiiMqttEndpoint> {
  const s = sender.pushInstallation();
  return s.installMqtt(false)
    .then(({installationID}) => s.getMqttEndpoint(installationID))
}

function getTopic(group: KiiGroup, name: string): Promise<KiiTopic> {
  return group.listTopics()
    .then(([[topic], _]) => topic ? topic : group.topicWithName(name).save())
    .then(topic => KiiUser.getCurrentUser().pushSubscription().isSubscribed(topic))
    .then(([psub, topic, b]) => b ? Promise.resolve([psub, topic]) : psub.subscribe(topic))
    .then(([sub, topic]) => topic)
}

function connectWS(ep: KiiMqttEndpoint, store: Redux.Store<{kiicloud: KiiCloudState}>): Promise<Paho.MQTT.Client> {
  const { kiicloud: { mqtt } }  = store.getState()
  if (mqtt.client) {
    const { clientId, host, path, port } = mqtt.client
    console.debug("skip connecting because MQTT client is found in store.", { clientId, host, path, port })
    return Promise.resolve(mqtt.client)
  }

  const client = new Paho.MQTT.Client(ep.host, ep.portWS, ep.mqttTopic);
  client.onConnectionLost = res => store.dispatch(connectionLost(res));
  client.onMessageArrived = msg => store.dispatch(messageArrived(JSON.parse(msg.payloadString)));
  return new Promise((resolve, reject) => {
    client.connect({
      userName: ep.username,
      password: ep.password,
      onSuccess: () => {
        client.subscribe(ep.mqttTopic);
        resolve(client);
        store.dispatch(connectionAlive({endpoint: ep, client}));
      },
      onFailure: (err: Error) => reject(err),
    });
  })
}

function updateMessage(g: KiiGroup, text: string): Promise<{}> {
  const u = KiiUser.getCurrentUser();
  const e = g.bucketWithName(LATEST_MESSAGE_BUCKET_NAME).createObjectWithID(u.getUUID());
  e.set(FIELD_STATUS, { text })
  e.set("login", u.getUsername())
  return e.saveAllFields();
}

function sendMessage(sender: KiiUser, topic: KiiTopic, text: string): Promise<{}> {
  const m: StatusMessage = {
    sender: sender.getUUID(),
    modifiedAt: new Date().getTime(),
    text,
  }
  const data = {value: JSON.stringify({type: "UPDATE-STATUS", payload: m})};
  const msg = new KiiPushMessageBuilder(data).build()
  return topic.sendMessage(msg)
}

const sendStatusEpic = Epic.fromPromise(
  "SEND-MESSAGE",
  ({ payload: { group, topic, text } }: Action<SendMessagePayload>, s: Redux.Store<{kiicloud: KiiCloudState}>) =>
    updateMessage(group, text)
      .then(_ => sendMessage(s.getState().kiicloud.profile.me, topic, text))
)

const connectEpic = Epic.fromPromise(
  "CONNECT",
  ({ payload }: Action<ConnectPayload>, store: Redux.Store<{kiicloud: KiiCloudState}>) =>
    getMQTTEndpoint(KiiUser.getCurrentUser())
      .then(endpoint => connectWS(endpoint, store))
)

const connectionLostEpic = (a: ActionsObservable<{}>, store: Redux.Store<{kiicloud: KiiCloudState}>) =>
  Observable.of(
    a.ofType("CONNECTION-LOST")
      .filter(_ => !!store.getState().kiicloud.profile.me)
      .mapTo({type: "CONNECT.start-retry"}),

    a.ofType("CONNECT.start-retry")
      .do(_ => console.group("CONNECT.retry"))
      .mapTo({type: "CONNECT.retry"}),

    a.ofType("CONNECT.rejected").mapTo({type: "CONNECT.retry"}),

    a.ofType("CONNECT.retry")
      .map(_ => 1000 * (2 ** (store.getState().kiicloud.mqtt.retryCount - 1)))
      .do(t => console.log(`retry connecting ${t}ms later.`))
      .delayWhen(t => Observable.of(true).delay(t as number))
      .map(x => connect(store.getState().kiicloud.profile.group)),

    a.ofType("CONNECT.resolved")
      .filter(_ => store.getState().kiicloud.mqtt.retryCount > 0)
      .do(_ => {
        console.log(`retry connecting succeeded. retry-count: ${store.getState().kiicloud.mqtt.retryCount}`);
        console.groupEnd();
      })
      .mapTo({type: "CONNECT.end-retry"}),
  ).mergeAll()

const loadMembers = (g: KiiGroup) =>
  g.getMemberList()
    .then(([group, members]) => Promise.all(members.map(e => e.refresh())))

const LATEST_MESSAGE_BUCKET_NAME = "latest";
const FIELD_STATUS = "status";

const loadLatestMessages = (g: KiiGroup): Promise<StatusMessages> =>
  g.bucketWithName(LATEST_MESSAGE_BUCKET_NAME)
    .executeQuery(KiiQuery.queryWithClause(null))
    .then(([_, results]) => results.map(e => ({
      sender: (e as any)._owner.getUUID(),
      text: e.get(FIELD_STATUS).text,
      modifiedAt: e.getModified(),
    })))

import {
  loadMembers as _loadMembers,
  loadLatestMessages as _loadLatestMessages,
  saveToken,
  removeToken,
} from "./action"

const loadMembersEpic = combineEpics(
  connectEpic,

  Epic.fromPromise("LOAD-MEMBERS", ({payload}: Action<KiiGroup>) => loadMembers(payload)),

  Epic.fromPromise("LOAD-LATEST-MESSAGES", ({payload}: Action<KiiGroup>) => loadLatestMessages(payload)),

  (a: ActionsObservable<KiiGroup>, store: Redux.Store<{}>) =>
    a.ofType("SIGN-IN.resolved", "JOIN.resolved")
      .filter(({ payload: { groups: [ group ] } }) => group)
      .mergeMap(({ payload: { groups: [ group ] } }) => reconnectActions(group)),
)

const reconnectActions = (g: KiiGroup) =>
  Observable.of<Action<void | KiiGroup>>(connect(), _loadMembers(g), _loadLatestMessages(g))

const selectGroupEpic = (a: ActionsObservable<SelectGroupPayload>, store: Redux.Store<{kiicloud: KiiCloudState}>) =>
  a.ofType("SELECT-GROUP")
    .map(_ => store.getState().kiicloud.profile.group)
    .mergeMap(g => reconnectActions(g))

const groupMembersAddedEpic = (a: ActionsObservable<{}>, store: Redux.Store<{}>) =>
  a.ofType("GROUP-MEMBERS-ADDED")
    .map(_ => refresh())

const refreshEpic = (a: ActionsObservable<KiiGroup>, store: Redux.Store<{kiicloud: KiiCloudState}>) =>
  a.ofType("REFRESH")
    .map(_ => store.getState().kiicloud)
    .map(kiicloud => kiicloud.profile.group)
    .filter(group => !!group)
    .mergeMap(g => Observable.of(_loadMembers(g), _loadLatestMessages(g)))

const localStorageEpic = combineEpics(
  (a: ActionsObservable<{}>, store: Redux.Store<{}>) =>
    a.ofType("SIGN-UP.resolved", "SIGN-IN.resolved")
      .map(({ payload: { me } }) => me)
      .mergeMap(user => Observable.of(saveToken(user), connect()))
);

const inviteEpic = combineEpics(
  Epic.fromPromise(
    "INVITE",
    ({ payload: { invitee, group } }: Action<InvitePayload>) =>
      Kii.serverCodeEntry("invite").execute({invitee, groupName: group.getName()})
        .then(_ => _)),

  (a: ActionsObservable<{}>, store: Redux.Store<{}>) =>
    a.ofType("INVITE.rejected")
      .filter(a => a.payload.message.match(/USER_NOT_FOUND/))
      .mergeMap(_ => Observable.of({type: "INVITE.rejected#user_not_found"})),
)

const messageArrivedEpic = (a: ActionsObservable<KiiPushMessage>, store: Redux.Store<{}>) =>
  a.ofType("MESSAGE-ARRIVED")
    .map(m => JSON.parse(m.payload.value))
    //.do(m => console.log(m))
    .filter(a => a.type)
    .mergeMap(a => Observable.of(a))

export const rootEpic = combineEpics(
  joinEpic,
  sendStatusEpic,
  combineEpics(
    signUpEpic,
    signInEpic,
    signOutEpic,
  ),
  connectionLostEpic,
  loadMembersEpic,
  refreshEpic,
  localStorageEpic,
  selectGroupEpic,
  inviteEpic,
  messageArrivedEpic,
  groupMembersAddedEpic,
)
