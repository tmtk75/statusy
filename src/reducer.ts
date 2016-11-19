import { handleActions, Action } from "redux-actions"
import { combineReducers } from "redux"
import { KiiUser, KiiGroup, KiiTopic, KiiMqttEndpoint, KiiObject } from "kii-sdk"
import * as Paho from "paho"
import { Map, Set } from "immutable"

const assign = Object.assign;

const profile = handleActions<ProfileState, any>({
  "SIGN-UP.resolved": (s: ProfileState, { payload: { me } }: Action<{me: KiiUser}>) =>
    assign({}, s, {me, group: null}),

  "SIGN-IN.resolved": (s: ProfileState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, {me, group: groups[0], groups}),

  "SIGN-OUT": (s: ProfileState, a: Action<{}>) =>
    assign({}, s, {me: null, group: null, topic: null}),

  "JOIN.resolved": (s: ProfileState, { payload: { me, groups } }: Action<SignInResolvedPayload>) =>
    assign({}, s, {me, group: groups[0], groups}),

  "INVITED.resolved": (s: ProfileState, { payload: { inviter, group } }: Action<InvitedResolvedPayload>) =>
    assign({}, s, {group, groups: Set(s.groups).add(group).toArray()}),

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

const ui = handleActions<UIState, any>({
  "TOGGLE-LEFT-DRAWER": (s: UIState, a: Action<{}>) =>
    assign({}, s, {leftDrawer: !s.leftDrawer})
}, {leftDrawer: false})

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

