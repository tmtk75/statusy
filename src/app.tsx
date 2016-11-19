import * as React from "react"
import * as moment from "moment"
import { remote } from "electron"
import { Dispatch } from "redux"
import { Action } from "redux-actions"
import { FlatButton, TextField, Subheader, Divider,  List, ListItem, Avatar, SelectField, MenuItem, IconButton, Drawer } from "material-ui"
import IconChatBubble from 'material-ui/svg-icons/communication/chat-bubble';
import IconAccountBox from 'material-ui/svg-icons/action/account-box';
import { darkBlack } from 'material-ui/styles/colors';
import {
  connect,
  disconnect,
  loadMembers,
  signUp,
  signIn,
  signOut,
  join,
  sendMessage,
  loadLatestMessages,
  selectGroup,
  invite,
  toggleLeftDrawer,
} from "./action"
import { KiiUser, KiiPushMessage, KiiGroup } from "kii-sdk"

type AppProps = {
  dispatch: Dispatch<Action<any>>,
  kiicloud: KiiCloudState,
  messages: MessagesState,
  members: MembersState,
  github_token: string,
  ui: UIState,
  error: {
    rejected: Error,
  },
}

type LoginState = {
  username?: string,
  password?: string,
}

class Login extends React.Component<AppProps, LoginState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      username: localStorage.getItem("username"),
      password: localStorage.getItem("password"),
    }
  }
  render() {
    const { dispatch, kiicloud: { profile: { me } } } = this.props;
    const { username, password } = this.state;
    return (
      <div>
        <TextField
          disabled={!!me}
          floatingLabelText="username"
          value={username}
          onChange={(e: React.FormEvent<TextField>) => this.setState({username: (e.target as any).value})}
          />
        <TextField
          disabled={!!me}
          type="password"
          floatingLabelText="password"
          value={password}
          onChange={(e: React.FormEvent<TextField>) => this.setState({password: (e.target as any).value})}
          />
        <div style={{display:"flex", justifyContent:"center"}}>
          <FlatButton
            label="sign up"
            disabled={!!me}
            onClick={_ => dispatch(signUp({username, password}))}
            />
          <FlatButton
            label="sign in"
            disabled={!!me}
            onClick={_ => dispatch(this.makeSignInAction(this.state))}
            />
          </div>
        <div style={{display:"flex", justifyContent:"center"}}>
          <FlatButton
            label="sign out"
            disabled={!me}
            onClick={_ => dispatch(signOut())}
            />
        </div>
      </div>
    )
  }
  makeSignInAction(s: LoginState): Action<SignInPayload> {
    const tk = localStorage.getItem("token");
    if (tk) {
      console.debug("sign in with token.");
      return signIn({token: tk});
    }
    console.debug("sign in with username and password.");
    const { username, password } = s;
    return signIn({username, password})
  }
}

class Connect extends React.Component<AppProps, {github_token: string}> {

  public static defaultProps = {github_token: localStorage.getItem("github_token") || ""};

  constructor(props: AppProps) {
    super(props);
    this.state = {
      github_token: props.github_token,
    }
  }
  render() {
    const { dispatch, kiicloud: { profile: { me, group, groups }, mqtt: { client } } } = this.props;
    return (
      <div>
        <TextField
          floatingLabelText="github_token"
          fullWidth={true}
          value={this.state.github_token}
          onChange={(e: React.FormEvent<TextField>) => this.setState({github_token: (e.target as any).value})}
          />
        <div style={{display:"flex", justifyContent:"center"}}>
          <FlatButton
            label="join"
            disabled={!me || !this.state.github_token}
            onClick={_ => dispatch(join({github_token: this.state.github_token}))}
            />
        </div>
        <div>
        {
          groups.length > 0 ? null :
          <span>Please join a group or groups since you're not in any groups.</span>
        }
        {
          this.state.github_token ? null :
          <span> Generate a token at <a href="#" onClick={() => remote.shell.openExternal('https://github.com/settings/tokens')}>here</a> if you don't have it.</span>
        }
        </div>
      </div>
    )
  }
}

class Group extends React.Component<AppProps, {group: string}> {
  render() {
    const { dispatch, kiicloud, kiicloud: { profile: { group, groups } } } = this.props;
    if (!group || groups.length < 2) {
      return null
    }
    return (
      <div>
        <SelectField
          floatingLabelText="organization"
          value={group}
          onChange={(event: any, index: number, g: KiiGroup) =>
            g !== group ? dispatch(selectGroup({group: g, kiicloud})) : null}
          >
          {groups.map(g => <MenuItem key={g.getName()} value={g} primaryText={g.getName()} />)}
        </SelectField>
      </div>
    )
  }
}

class Message extends React.Component<AppProps, {status: string}> {
  constructor(props: AppProps) {
    super(props)
    this.state = {
      status: "",
    }
  }
  render() {
    const { dispatch, kiicloud: { profile: { me, group }, mqtt: { client } } } = this.props;
    return (
      <div>
        <TextField
          disabled={!me || !group}
          floatingLabelText="status"
          fullWidth={true}
          errorText={!!this.state.status && !client ? "not connected" : null}
          value={this.state.status}
          onChange={(e: React.FormEvent<TextField>) => this.setState({status: (e.target as any).value})}
          onKeyDown={e => e.keyCode === 13 ? this.handleSendMessage(e) : null}
          />
      </div>
    )
  }
  handleSendMessage(e: React.FormEvent<TextField & FlatButton> | React.KeyboardEvent<{}>) {
    const { dispatch, kiicloud: { profile: { topic, group } } } = this.props;
    if (!group) {
      console.debug("group is not found.");
    }
    if (!topic) {
      console.debug(`topic is not found for ${group.getName()}`);
      return;
    }
    dispatch(sendMessage({group, topic, text: this.state.status}));
    //this.setState({status: ""});
  }
}

class Members extends React.Component<AppProps, {}> {
  constructor(props: AppProps) {
    super(props)
  }
  render() {
    const { messages: { pushMessages }, members: { users } } = this.props;
    return (
      <div className="members">
        <List>
          {/*<Subheader>Recent statuses in {group ? group.getName() : null}</Subheader>*/}
          {users.toList().map(e =>
            <div
              key={e.getUUID()}
              className="members-memberItem"
              >
              <MemberItem user={e} message={pushMessages.get(e.getUUID())}/>
            </div>
          )}
        </List>
      </div>
    )
  }
}

class MemberItem extends React.Component<{user: KiiUser, message: StatusMessage}, {}> {
  render() {
    const { user, message } = this.props;

    if (!user || !message) {
      // TODO: reducer should provide default values
      return (
        <ListItem
          disabled={true}
          leftAvatar={<Avatar src={user.get("avatar_url")} />}
          primaryText={"No status"}
          secondaryText={
            <p>
              <span>{user.getUsername()}</span>
            </p>
          }
          />
      )
    }

    const t = moment.duration(moment.now() - message.modifiedAt)
    return (
      <ListItem
        disabled={true}
        leftAvatar={<Avatar src={user.get("avatar_url")} />}
        primaryText={message.text}
        secondaryText={
          <p>
            <span>{user.getUsername()}</span>
            <span className="members-modifiedAt">{t.humanize()} ago</span>
          </p>
        }
        />
    )
  }
  componentDidMount() {
    setInterval(() => this.forceUpdate(), 1000 * 5);
  }
}

class Invite extends React.Component<AppProps, {invitee: string}> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      invitee: "",
    }
  }
  render() {
    const { kiicloud: { profile: { me, group } } } = this.props;
    const toGroup = group ? ` to ${group.getName()}` : ""
    return (
      <div>
        <TextField
          disabled={!me || !group}
          floatingLabelText={`invite${toGroup}`}
          fullWidth={true}
          value={this.state.invitee}
          onChange={(e: React.FormEvent<TextField>) => this.setState({invitee: (e.target as any).value})}
          onKeyDown={e => e.keyCode === 13 ? this.invite(e) : null}
          />
      </div>
    )
  }
  invite(e: React.KeyboardEvent<{}>) {
    const { dispatch, kiicloud: { profile: { group } } } = this.props;
    dispatch(invite({invitee: this.state.invitee, group}));
  }
}

class Debug extends React.Component<AppProps, {}> {
  constructor(props: AppProps) {
    super(props);
  }
  render() {
    const {
      dispatch,
      kiicloud: { profile: { me, group, topic }, mqtt: { client } },
      messages: {
        pushMessages,
      },
      members,
      error: { rejected }
    } = this.props;

    return (
      <div className="Debug">
        <div>me: {me ? me.getUsername() : null}</div>
        <div>group: {group ? group.getName() : null}</div>
        <div>connected: {client ? "connected" : "disconnected"}</div>
        <div>error: {rejected ? rejected.message : null}</div>
        <FlatButton
          label="connect"
          disabled={!!client}
          onClick={_ => dispatch(connect())}
          />
        <FlatButton
          label="load members"
          disabled={!group}
          onClick={_ => dispatch(loadMembers(group))}
          />
        <FlatButton
          label="load latest messages"
          disabled={!group}
          onClick={_ => dispatch(loadLatestMessages(group))}
          />
        <FlatButton
          disabled={!client}
          label="disconnect"
          onClick={_ => dispatch(disconnect(this.props.kiicloud))}
          />
      </div>
    )
  }
}

class AppStatusBar extends React.Component<AppProps, {}> {
  render() {
    const { kiicloud: { profile: { group } } } = this.props;
    return (
      <div className="appStatusBar">
        Recent statuses in {group ? group.getName() : null}
      </div>
    )
  }
}

class AppNaviBar extends React.Component<AppProps, {}> {
  render() {
    const { dispatch, ui: { leftDrawer } } = this.props;
    return (
      <div className="appNaviBar">
        <IconButton tooltip="Settings" onClick={() => dispatch(toggleLeftDrawer())}>
          <IconAccountBox />
        </IconButton>
        <Drawer open={leftDrawer} className="appLeftDrawer">
          <LeftDrawer {...this.props}/>
        </Drawer>
      </div>
    )
  }
}

class LeftDrawer extends React.Component<AppProps, {}> {
  render() {
    const { dispatch, ui: { leftDrawer } } = this.props;
    const { kiicloud: { profile: { me } } } = this.props;
    return (
      <div>
        <div className="appLeftDrawer-header">
          <img src={me ? me.get("avatar_url") : null} width="40px" style={{margin:"2px", borderRadius:"2px"}}/>
          <span style={{marginLeft:"0.5rem"}}>{me ? me.getUsername() : null}</span>
        </div>
        <div className="appLeftDrawer-body">
          <Login {...this.props}/>
          <Connect {...this.props}/>
          <div style={{display:"flex", justifyContent:"center"}}>
            <FlatButton
              label="back"
              onClick={() => dispatch(toggleLeftDrawer())}
              />
          </div>
        </div>
      </div>
    )
  }
}

export default class App extends React.Component<AppProps, {}> {
  render() {
    return (
      <div>
        <AppStatusBar {...this.props}/>
        <AppNaviBar {...this.props}/>
        <div className="appBody">
          <Message {...this.props}/>
          <Members {...this.props}/>
          <Group {...this.props}/>
          <Invite {...this.props}/>
          <hr />
          <Debug {...this.props}/>
        </div>
      </div>
    )
  }
  componentDidMount() {
    const { dispatch } = this.props;
    const tk = localStorage.getItem("token");
    if (!tk)
      return;
    console.debug("sign in with token since a save token is found.");
    dispatch(signIn({token: tk}))
  }
}
