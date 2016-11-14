import * as React from "react"
import * as moment from "moment"
import { remote } from "electron"
import { Dispatch } from "redux"
import { Action } from "redux-actions"
import { FlatButton, TextField, Subheader, Divider,  List, ListItem, Avatar, SelectField, MenuItem } from "material-ui"
import CommunicationChatBubble from 'material-ui/svg-icons/communication/chat-bubble';
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
} from "./action"
import { KiiUser, KiiPushMessage, KiiGroup } from "kii-sdk"

type AppProps = {
  dispatch: Dispatch<Action<any>>,
  kiicloud: KiiCloudState,
  messages: MessagesState,
  members: MembersState,
  github_token: string,
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
          style={{width: '48%'}}
          value={this.state.username}
          onChange={(e: React.FormEvent<TextField>) => this.setState({username: (e.target as any).value})}
          />
        <TextField
          disabled={!!me}
          type="password"
          floatingLabelText="password"
          style={{width: '48%'}}
          value={this.state.password}
          onChange={(e: React.FormEvent<TextField>) => this.setState({password: (e.target as any).value})}
          />
        <FlatButton
          label="sign up"
          disabled={!!me}
          onClick={_ => dispatch(signUp({username, password}))}
          />
        <FlatButton
          label="sign in"
          disabled={!!me}
          onClick={_ => dispatch(signIn({username, password}))}
          />
        <FlatButton
          label="sign out"
          disabled={!me}
          onClick={_ => dispatch(signOut())}
          />
      </div>
    )
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
        <div>
          <TextField
            floatingLabelText="github_token"
            fullWidth={false}
            value={this.state.github_token}
            onChange={(e: React.FormEvent<TextField>) => this.setState({github_token: (e.target as any).value})}
            />
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
    if (!topic) {
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
    const { dispatch, kiicloud: { profile: { group } }, messages: { pushMessages }, members: { users } } = this.props;
    return (
      <div className="members">
        <List>
          <Subheader>Recent statuses in {group ? group.getName() : null}</Subheader>
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
        <div>connected: {topic ? "connected" : "disconnected"}</div>
        <div>error: {rejected ? rejected.message : null}</div>
        <FlatButton
          label="connect"
          disabled={!!client || !me || !group}
          onClick={_ => dispatch(connect(group))}
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

export default class App extends React.Component<AppProps, {}> {
  render() {
    return (
      <div>
        <Message {...this.props}/>
        <Members {...this.props}/>
        <Login {...this.props}/>
        <Connect {...this.props}/>
        <Group {...this.props}/>
        <Invite {...this.props}/>
        <hr />
        <Debug {...this.props}/>
      </div>
    )
  }
  componentDidMount() {
    const { dispatch } = this.props;
    const tk = localStorage.getItem("token");
    if (!tk)
      return;
    dispatch(signIn({token: tk}))
  }
}
