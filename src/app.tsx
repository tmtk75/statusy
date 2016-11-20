import * as React from "react"
import * as moment from "moment"
import { remote } from "electron"
import { Dispatch } from "redux"
import { Action } from "redux-actions"
import { FlatButton, TextField, Subheader, Divider,  List, ListItem, Avatar, SelectField, MenuItem, IconButton, Drawer } from "material-ui"
import IconAccountBox from 'material-ui/svg-icons/action/account-box';
import IconMenu from 'material-ui/svg-icons/navigation/menu';
import IconGroup from 'material-ui/svg-icons/social/group';
import IconGroupAdd from 'material-ui/svg-icons/social/group-add';
import IconSearch from 'material-ui/svg-icons/action/search';
import IconClear from 'material-ui/svg-icons/content/clear';
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
  filterByText,
  clearMessages,
} from "./action"
import { KiiUser, KiiPushMessage, KiiGroup } from "kii-sdk"
const { debug } = remote.getGlobal("config");

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
        <div className="section">
          <IconAccountBox /> <span className="section-text">Account</span>
        </div>
        <TextField
          disabled={!!me}
          hintText="username"
          value={username || ""}
          onChange={(e: React.FormEvent<TextField>) => this.setState({username: (e.target as any).value})}
          />
        <TextField
          disabled={!!me}
          type="password"
          hintText="password"
          value={password || ""}
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
        <div className="section">
          <IconGroup /><span className="section-text">Join by yourself</span>
        </div>
        <TextField
          hintText="github_token"
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
          <span>You can ask someone else to invite you, or generate a token at <a href="#" onClick={() => remote.shell.openExternal('https://github.com/settings/tokens')}>here</a> if you don't have it.</span>
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
          hintText="organization"
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
          hintText="status"
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
    const { dispatch, kiicloud: { profile: { group } } } = this.props;
    if (!group) {
      console.debug("group is not found.");
      return;
    }
    const topic = group.topicWithName("broadcast");
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
    const { ui: { filterText } } = this.props;
    return (
      <div className="members">
        <List>
          {/*<Subheader>Recent statuses in {group ? group.getName() : null}</Subheader>*/}
          {users.toList()
            .filter(e => !!e.getUsername().match(filterText))
            .map(e =>
              <div
                key={e.getUUID()}
                className="members-memberItem"
                >
                <MemberItem user={e} message={pushMessages.get(e.getUUID())}/>
              </div>)}
        </List>
      </div>
    )
  }
}

class MemberItem extends React.Component<{user: KiiUser, message: StatusMessage}, {}> {
  render() {
    const { user, message } = this.props;
    const msg = message ? message : {
      modifiedAt: moment.now(),
      text: "no message yet",
    }
    const t = moment.duration(moment.now() - msg.modifiedAt)
    return (
      <ListItem
        disabled={true}
        leftAvatar={<Avatar src={user.get("avatar_url")} />}
        primaryText={msg.text}
        secondaryText={
          <p>
            <span>{user.getUsername()}</span>
            <span className="members-modifiedAt">{t.humanize()} ago</span>
          </p>
        }
        />
    )
  }
  _id: number
  componentDidMount() {
    this._id = setInterval(() => this.forceUpdate(), 1000 * 5);
  }
  componentWillUnmount() {
    clearInterval(this._id);
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
      <div className="section">
        <IconGroupAdd style={{color:"#aaa", marginRight:"0.5rem"}}/>
        <TextField
          disabled={!me || !group}
          hintText={`invite${toGroup}`}
          fullWidth={false}
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
          disabled={!!client || !me}
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

class Search extends React.Component<AppProps, {filterText: string}> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      filterText: localStorage.getItem("filterText") || "",
    }
  }
  render() {
    return (
      <div className="section">
        <IconSearch style={{color:"#aaa", marginRight:"0.5rem"}}/>
        <TextField
          hintText="filter pattern"
          value={this.state.filterText}
          onChange={(e: React.FormEvent<TextField>) =>
            this.setState({filterText: (e.target as any).value}, this.filter)}
          />
        <IconButton tooltip="Clear" onClick={() => this.setState({filterText: ""}, this.filter)}>
          <IconClear />
        </IconButton>
      </div>
    )
  }
  filter() {
    this.props.dispatch(filterByText(this.state.filterText));
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
    const { kiicloud: { profile: { me } } } = this.props;
    return (
      <div className="appNaviBar">
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <IconButton tooltip="Settings" onClick={() => dispatch(toggleLeftDrawer())}>
            <IconMenu />
          </IconButton>
          <div style={{marginRight:"12px"}}>
            { !me ? null : me.getUsername() }
          </div>
        </div>
        <Drawer open={leftDrawer}>
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
      <div className="appLeftDrawer">
        <div className="appLeftDrawer-header">
          <img src={me ? me.get("avatar_url") : null} width="40px" style={{margin:"2px", borderRadius:"2px"}}/>
          <span style={{marginLeft:"0.5rem"}}>{me ? me.getUsername() : null}</span>
        </div>
        <div className="appLeftDrawer-body">
          <div style={{display:"flex", justifyContent:"center"}}>
            <FlatButton
              label="back"
              onClick={() => dispatch(toggleLeftDrawer())}
              />
          </div>
          <hr/>
          <Login {...this.props}/>
          <hr/>
          <Connect {...this.props}/>
        </div>
      </div>
    )
  }
}

class AppNotif extends React.Component<AppProps, {}> {
  render() {
    const { error: { rejected }, kiicloud: { mqtt } } = this.props;
    const warns = [
      rejected ? rejected.message : null,
      !mqtt.client ? "Disconnected, please sign-in and connect": null,
    ]
    const { ui: { messages } } = this.props;
    return (
      <div className="appNotif">
        {messages.map(e =>
          <div key={e.text + e.timestamp}
            className="appNotif-container appNotif-container_notif">{e.text}</div>
        )}
        {warns.filter(e => e).map(e =>
          <div key={e}
            className="appNotif-container appNotif-container_warn">{e}</div>
        )}
      </div>
    )
  }
  componentDidMount() {
    const f = () => {
      const { dispatch, ui: { messages } } = this.props;
      if (messages.size > 0)
        dispatch(clearMessages(moment.now()));
    }
    setInterval(f, 2000);
  }
}

class AppFooter extends React.Component<AppProps, {}> {
  render() {
    return (
      <div className="appFooter">
        Powered by Kii Cloud
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
          <Search {...this.props}/>
          <Invite {...this.props}/>
          {!debug ? null :
            <div>
              <hr />
              <Debug {...this.props}/>
            </div>}
        </div>
        <AppFooter {...this.props}/>
        <AppNotif {...this.props}/>
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
