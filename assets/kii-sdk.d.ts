declare module "kii-sdk" {

  class Kii {
    static initializeWithSite(app_id: string, app_key: string, endpoint_url: string): void;
    static serverCodeEntry(name: string): KiiServerCodeEntry;
    static setAccessTokenExpiration(expireIn: number): void;
  }

  class KiiServerCodeExecResult {
    getReturnedValue(): {returnedValue: any};
  }

  class KiiServerCodeEntry {
    execute(arg: Object): Promise<[string /*entry*/, Object /*args*/, KiiServerCodeExecResult]>;
  }

  class KiiObject {
    get(key: string): any;
    set(key: string, value: any): void;
    saveAllFields(): Promise<{createdAt: number, modifiedAt: number}>;
    getModified(): number;
  }

  class KiiQuery {
    static queryWithClause(c: any): KiiQuery;
  }

  class KiiBucket {
    createObjectWithID(id: string): KiiObject;
    executeQuery(q: KiiQuery): Promise<[KiiQuery, Array<KiiObject>, KiiQuery /*next*/]>;
  }

  class KiiGroup {
    static groupWithID(id: string): KiiGroup;
    static registerGroupWithID(id: string, name: string, members: Array<KiiUser>): Promise<KiiGroup>;
    refresh(): Promise<KiiGroup>;
    getID(): string;
    getName(): string;
    listTopics(): Promise<[Array<KiiTopic>, string /*paginationKey*/]>;
    topicWithName(name: string): KiiTopic;
    save(): Promise<KiiGroup>;
    addUser(u: KiiUser): void;
    getMemberList(): Promise<[KiiGroup, Array<KiiUser>]>;
    bucketWithName(name: string): KiiBucket;
  }

  class KiiUser {
    static userWithID(id: string): KiiUser;
    static userWithUsername(username: string, password: string): KiiUser;
    static userWithURI(uri: string): KiiUser;
    static authenticateWithToken(token: string): Promise<KiiUser>;
    static getCurrentUser(): KiiUser;
    static findUserByUsername(username: string): Promise<KiiUser>;
    static authenticate(username: string, password: string): Promise<KiiUser>;
    register(): Promise<KiiUser>;
    refresh(): Promise<KiiUser>;
    get(name: string): any;
    getUUID(): string;
    getAccessToken(): string;
    getUsername(): string;
    pushInstallation(): KiiPushInstallation;
    pushSubscription(): KiiPushSubscription;
    memberOfGroups(): Promise<[KiiUser, Array<KiiGroup>]>;
  }

  class KiiTopic {
    save(): Promise<KiiTopic>;
    sendMessage(msg: KiiPushMessage): Promise<KiiTopic>;
    getName(): string;
  }

  class KiiPushInstallation {
    installMqtt(dev: boolean): Promise<{installationID: string}>;
    getMqttEndpoint(instID: string): Promise<KiiMqttEndpoint>;
  }

  class KiiPushSubscription {
    isSubscribed(t: KiiTopic): Promise<[KiiPushSubscription, KiiTopic, boolean]>;
    subscribe(t: KiiTopic): Promise<[KiiPushSubscription, KiiTopic]>
  }

  class KiiPushMessage {
    //objectScopeGroupID: string; // 'kiicorp'
    sender:             string; // '3639fcbfbba0-e…87f4'
    //sourceURI:          string; // 'kiicloud://gro…atus'
    //objectScopeType:    string; // 'APP_AND_GROUP'
    //topic:              string; // 'status'
    //objectScopeAppID:   string; // '2cdc6549'
    ///senderURI:          string; // 'kiicloud://use…87f4'
    value:              string; // '{"message":"asdf"}'
    when:               number; // 1478324740503
  }

  class KiiPushMessageBuilder {
    constructor(a: Object | string | number);
    build(): KiiPushMessage;
  }

  interface KiiMqttEndpoint {
    readonly host: string;
    readonly portWS: number;
    readonly username: string;
    readonly password: string;
    readonly mqttTopic: string;
  }

}
