import { handleActions, Action } from "redux-actions"
import { combineReducers } from "redux"
import { KiiUser, KiiGroup, KiiTopic, KiiMqttEndpoint, KiiObject, KiiPushMessage } from "kii-sdk"
import * as Paho from "paho"
import { Map } from "immutable"

const assign = Object.assign;

const profile = handleActions<ProfileState>({
  "SIGN-UP.resolved": (s: ProfileState, a: Action<KiiUser>) =>
    assign({}, s, {me: a.payload, group: null}),

  "SIGN-IN.resolved": (s: ProfileState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, {me, group: groups[0], groups}),

  "SIGN-OUT": (s: ProfileState, a: Action<{}>) =>
    assign({}, s, {me: null}),

  "JOIN.resolved": (s: ProfileState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, {me, group: groups[0], groups}),

  "SELECT-GROUP": (s: ProfileState, { payload: { group } }: Action<SelectGroupPayload>) =>
    assign({}, s, {group: s.groups.find(g => g == group)}),

  "CONNECT.resolved": (s: ProfileState, a: Action<{topic: KiiTopic}>) =>
    assign({}, s, a.payload),

  "DISCONNECT": (s: ProfileState, a: Action<{}>) =>
    assign({}, s, {topic: null}),
}, {groups: []} /* initial state */)

const mqtt = handleActions<MQTTState>({
  "CONNECTION-ALIVE": (s: MQTTState, a: Action<{endpoint: KiiMqttEndpoint, client: Paho.MQTT.Client}>) =>
    assign({}, s, a.payload),

  "CONNECTION-LOST": (s: MQTTState, a: Action<{}>) =>
    assign({}, s, {endpoint: null, client: null}),

  "CONNECT.start-retry": (s: MQTTState, a: Action<{}>) =>
    assign({}, s, {retryCount: 0}),

  "CONNECT.retry": (s: MQTTState, a: Action<{}>) =>
    assign({}, s, {retryCount: s.retryCount + 1}),

  "CONNECT.end-retry": (s: MQTTState, a: Action<{}>) =>
    assign({}, s, {retryCount: null}),
}, {endpoint: null, client: null, retryCount: undefined} /* initial state */)

const messages = handleActions<MessagesState, KiiPushMessage | StatusMessages>({
  "MESSAGE-ARRIVED":  (s: MessagesState, {payload}: Action<KiiPushMessage>) =>
    assign({}, s, {
      pushMessages: s.pushMessages.set(
        payload.sender,
        assign({modifiedAt: payload.when}, JSON.parse(payload.value))
      ),
    }),

  "LOAD-LATEST-MESSAGES.resolved": (s: MessagesState, {payload}: Action<StatusMessages>) =>
    assign({}, s, {
      pushMessages: Map(payload.map(e => [e.sender, e])),
    }),
}, {pushMessages: Map<UserID, StatusMessage>()} /* initial state */)

const members = handleActions<MembersState, Array<KiiUser>>({
  "LOAD-MEMBERS.resolved":  (s: MembersState, a: Action<Array<KiiUser>>) =>
    assign({}, s, {users: Map(a.payload.map(u => [u.getUUID(), u]))}),
}, {users: Map<UserID, KiiUser>()} /* initial state */)

const error = (s: any = {}, a: Action<Error>) => {
  if (a.type.match(/\.rejected$/)) {
    console.error(a.type, a.payload);
    return assign({}, s, {rejected: a.payload});
  } else if (a.type.match(/\.resolved/)) {
    return assign({}, s, {rejected: null});
  }
  return s;
}

export const reducer = combineReducers({
  kiicloud: combineReducers({
    profile,
    mqtt,
  }),
  messages,
  members,
  error,
})

