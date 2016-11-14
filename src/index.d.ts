import * as Paho from "paho"
import { KiiUser, KiiGroup, KiiTopic, KiiMqttEndpoint } from "kii-sdk"
import { StoreCreator } from "redux"
import { Map } from "immutable"

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

  type JoinPayload = {
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

  interface Window {
    devToolsExtension(): StoreCreator;
  }

}
