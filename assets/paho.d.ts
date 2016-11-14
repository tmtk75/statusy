declare module "paho" {
  export module MQTT {
    type connArgs = {
      userName: string,
      password: string,
      onSuccess: () => void,
      onFailure: (err: Error) => void,
    };

    type ErrorResponse = {
      errorCode: number,
      errorMessage: string,
    }

    type Message = {
      readonly payloadString: string,
    }

    export class Client {
      constructor(host: string, port: number, topic: string);
      subscribe(topic: string): void;
      connect(args: connArgs): void;
      onConnectionLost: (res: ErrorResponse) => void;
      onMessageArrived: (msg: Message) => void;
      disconnect(): void;
      clientId: string;
      host: string;
      path: string;
      port: number;
    }
  }
}
