import { createAction } from "redux-actions"
import { KiiUser, KiiGroup, KiiPushMessage } from "kii-sdk"

export const connect = createAction<void>("CONNECT");

export const disconnect = createAction<void>("DISCONNECT", ({ mqtt: { client } }: KiiCloudState) => {
  if (!client) {
    //console.log("no client");
    return
  }
  client.disconnect();
  //console.log("disconnect");
});

export const loadMembers = createAction<KiiGroup>("LOAD-MEMBERS");

function saveUsername(p: SignUpPayload): SignUpPayload {
  if (p.username && p.username) {
    localStorage.setItem("username", p.username)
    localStorage.setItem("password", p.password)
  }
  return p;
}

export const signUp = createAction<SignUpPayload>("SIGN-UP", saveUsername);

export const signIn = createAction<SignInPayload>("SIGN-IN", saveUsername);

export const saveToken = createAction<void>("SAVE-TOKEN", (user: KiiUser) => {
  if (user.getAccessToken() === localStorage.getItem("token")) {
    console.debug("the same token exists.");
    return;
  }
  localStorage.setItem("token", user.getAccessToken());
  localStorage.setItem("token.savedAt", new Date().toString());
  console.debug("saved a token.");
});

export const removeToken = createAction<void>("REMOVE-TOKEN", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("token.savedAt");
  console.debug("removed a token.");
});

export const signOut = createAction<void>("SIGN-OUT", () => {
  removeToken();
});

export const link = createAction<{github_token: string}>("LINK", (payload) => {
  localStorage.setItem("github_token", payload.github_token);
  return payload;
});

export const subscribeTopics = createAction<SubscribeTopicsPayload>("SUBSCRIBE-TOPICS");

export const sendMessage = createAction<SendMessagePayload>("SEND-MESSAGE");

export const loadLatestMessages = createAction<KiiGroup>("LOAD-LATEST-MESSAGES");

export const connectionLost = createAction("CONNECTION-LOST");

export const messageArrived = createAction<KiiPushMessage>("MESSAGE-ARRIVED");

export const connectionAlive = createAction<MQTTConn>("CONNECTION-ALIVE");

export const refresh = createAction<{}>("REFRESH");

export const selectGroup = createAction<SelectGroupPayload>("SELECT-GROUP", (payload) => {
  localStorage.setItem("group", payload.group.getName());
  return payload;
});

export const invite = createAction<InvitePayload>("INVITE");

export const openLeftDrawer = createAction<{}>("OPEN-LEFT-DRAWER");

export const closeLeftDrawer = createAction<{}>("CLOSE-LEFT-DRAWER");

export const filterByText = createAction<{}>("FILTER-BY-TEXT", (payload) => {
  localStorage.setItem("filterText", payload);
  return payload;
});

export const clearMessages = createAction<number /* timestamp */>("CLEAR-MESSAGES");
