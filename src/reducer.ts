import { handleActions, Action } from "redux-actions"
import { combineReducers } from "redux"
import { KiiUser, KiiGroup, KiiTopic, KiiMqttEndpoint, KiiObject } from "kii-sdk"
import * as Paho from "paho"
import { Map, Set, List } from "immutable"
import * as moment from "moment"

const assign = Object.assign;

KiiGroup.prototype.equals = function(a: KiiGroup): boolean {
  return this.getID() === a.getID();
}

const profile = handleActions<ProfileState, any>({
  "SIGN-UP.resolved": (s: ProfileState, { payload: { me } }: Action<{me: KiiUser}>) =>
    assign({}, s, {me, group: null}),

  "SIGN-IN.resolved": (s: ProfileState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, {me, group: groups[0], groups}),

  "SIGN-OUT": (s: ProfileState, a: Action<{}>) =>
    assign({}, s, {me: null, group: null, topic: null}),

  "LINK.resolved": (s: ProfileState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, {me, group: groups[0], groups}),

  "INVITED.resolved": (s: ProfileState, { payload: { inviter, group } }: Action<InvitedResolvedPayload>) =>
    assign({}, s, {
      group,
      groups: Set(s.groups).add(group).toArray(),
    }),

  "SELECT-GROUP": (s: ProfileState, { payload: { group } }: Action<SelectGroupPayload>) =>
    assign({}, s, {group: s.groups.find(g => g == group)}),

  "DISCONNECT": (s: ProfileState, a: Action<{}>) =>
    assign({}, s, {topic: null}),
}, {groups: []} /* initial state */)

const mqtt = handleActions<MQTTState, any>({
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

const messages = handleActions<MessagesState, StatusMessage | StatusMessages>({
  "UPDATE-STATUS":  (s: MessagesState, {payload}: Action<StatusMessage>) =>
    assign({}, s, {pushMessages: s.pushMessages.set(payload.sender, payload)}),

  "LOAD-LATEST-MESSAGES.resolved": (s: MessagesState, {payload}: Action<StatusMessages>) =>
    assign({}, s, {
      pushMessages: Map(payload.map(e => [e.sender, e])),
    }),
}, {pushMessages: Map<UserID, StatusMessage>()} /* initial state */)

const members = handleActions<MembersState, Array<KiiUser>>({
  "LOAD-MEMBERS.resolved":  (s: MembersState, a: Action<Array<KiiUser>>) =>
    assign({}, s, {users: Map(a.payload.map(u => [u.getUUID(), u]))}),
}, {users: Map<UserID, KiiUser>()} /* initial state */)

const nextMsgs = (messages: List<NotifMessage>, text: string) =>
  ({messages: messages.push({text, timestamp: moment.now()})})

const ui = handleActions<UIState, any>({
  "OPEN-LEFT-DRAWER": (s: UIState, a: Action<{}>) =>
    assign({}, s, {leftDrawer: true}),

  "CLOSE-LEFT-DRAWER": (s: UIState, a: Action<{}>) =>
    assign({}, s, {leftDrawer: false}),

  "FILTER-BY-TEXT": (s: UIState, { payload }: Action<string>) =>
    assign({}, s, {filterText: payload}),

  "LINK.resolved": (s: UIState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, nextMsgs(s.messages, `Succeeded to link at ${moment()}`)),

  "CONNECTION-ALIVE": (s: UIState) =>
    assign({}, s, nextMsgs(s.messages, `Connection alive`)),

  "INVITED.resolved": (s: UIState, { payload: { inviter, group } }: Action<InvitedResolvedPayload>) =>
    assign({}, s, nextMsgs(s.messages, `Invited by ${inviter.getUsername()} to ${group.getName()}`)),

  "USER-SIGNED-UP": (s: UIState, { payload: { username } }: Action<{username: string}>) =>
    assign({}, s, nextMsgs(s.messages, `${username} signed up`)),

  "CLEAR-MESSAGES": (s: UIState, { payload }: Action<number>) =>
    assign({}, s, {
      messages: s.messages.filter(e => e.timestamp + 1000 * 2 > payload),  // duration to be displayed 
    })
}, {leftDrawer: false, filterText: "", messages: List<NotifMessage>()})

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
  ui,
  error,
})

