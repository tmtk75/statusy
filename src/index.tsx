import * as React from "react"
import * as ReactDOM from "react-dom"
import { createStore, applyMiddleware } from "redux"
import { Provider, connect } from "react-redux"
import { createEpicMiddleware } from 'redux-observable'

//import darkBaseTheme from 'material-ui/styles/baseThemes/darkBaseTheme';
//import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import * as injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

import { remote } from 'electron'
import { Kii } from "kii-sdk"
const { kiicloud: { appID, appKey, apiEndpoint } } = remote.getGlobal('config');
Kii.initializeWithSite(appID, appKey, apiEndpoint);

import App from "./app"
import { rootEpic } from "./epic"
import { reducer } from "./reducer"

//
const devtools = window.devToolsExtension && window.devToolsExtension()
const middlewares = applyMiddleware(
  createEpicMiddleware(rootEpic),
)
const store = createStore(reducer, devtools, middlewares);
const MyApp = connect((a: any) => a)(App);

ReactDOM.render(
  //<MuiThemeProvider muiTheme={getMuiTheme(darkBaseTheme)}>
  <MuiThemeProvider>
    <Provider store={store}>
      <MyApp />
    </Provider>
  </MuiThemeProvider>
  , document.getElementById('main')
);

import { refresh } from "./action"
window.addEventListener('online', () => {
  console.debug("detected online.");
  store.dispatch(refresh());
});
