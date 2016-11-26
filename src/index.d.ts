import * as Paho from "paho"
import { KiiUser, KiiGroup, KiiTopic, KiiMqttEndpoint } from "kii-sdk"
import { StoreCreator } from "redux"
import { Map, List } from "immutable"

declare global {

  type KiiCloudState = {
      readonly profile: ProfileState,
      readonly mqtt: MQTTState,
  }

  type ProfileState = {
    readonly me?: KiiUser,
    readonly group?: KiiGroup,
    readonly groups?: Array<KiiGroup>,
    readonly topic?: KiiTopic,
  }

  type UIState = {
    readonly leftDrawer: boolean;
    readonly filterText: string;
    readonly messages: List<NotifMessage>;
  }

  class MQTTState extends MQTTConn {
     readonly retryCount: number;
  }

  type MessagesState = {
    readonly pushMessages: Map<UserID, StatusMessage>,
  };

  type MembersState = {
    readonly users: Map<UserID, KiiUser>;
  }

  type SignInResolvedPayload = {
    readonly me: KiiUser,
    readonly groups: Array<KiiGroup>,
  }

  type SubscribeTopicsPayload = {
    me: KiiUser,
    groups: Array<KiiGroup>,
  }

  type SendMessagePayload = {
    readonly group: KiiGroup;
    readonly topic: KiiTopic,
    readonly text: string;
  }

  type ConnectPayload = KiiGroup;

  type SignUpPayload = {
    readonly username: string,
    readonly password: string,
  }

  type TokenPayload = {
    readonly token: string,
  }

  type SignInPayload = SignUpPayload | TokenPayload;

  type LinkPayload = {
    readonly github_token: string,
  }

  type SelectGroupPayload = {
    readonly group: KiiGroup,
    readonly kiicloud: KiiCloudState,
  }

  type InvitePayload = {
    invitee: string,
    group: KiiGroup,
  }

  type InvitedPayload = {
    inviter: string,
    group: string,
  }

  type InvitedResolvedPayload = {
    inviter: KiiUser,
    group: KiiGroup,
    topics: Array<KiiTopic>,
  }

  class MQTTConn {
     readonly endpoint: KiiMqttEndpoint;
     readonly client: Paho.MQTT.Client;
  }

  type UserID = string;

  type StatusMessages = Array<StatusMessage>

  type StatusMessage = {
    readonly sender: UserID,
    readonly text: string,
    readonly modifiedAt: number,
  }

  type NotifMessage = {
    readonly text:  string,
    readonly timestamp: number,
  }

  type NotificationOption = {
    body: string,
    silent: boolean,
  }

  interface Notification {
    new (title: string, options: NotificationOption): Notification;
  }

  interface Window {
    devToolsExtension(): StoreCreator;
    Notification: Notification;
  }

}

declare module "kii-sdk" {

  interface KiiGroup {
    equals(a: KiiGroup): boolean;
  }

}
