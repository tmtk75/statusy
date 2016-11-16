const path        = require("path");
const electron    = require('electron');
const app         = electron.app;
const loadDevtool = require('electron-load-devtool');
const Tray        = electron.Tray;
const defaults    = require("./assets/defaults");

global.config = {
  github: {
    token: process.env["GITHUB_TOKEN"],
  },
  kiicloud: {
    appID:  process.env["KII_APP_ID"] || defaults.app_id,
    appKey: process.env["KII_APP_KEY"] || defaults.app_key,
    apiEndpoint: process.env["KII_API_ENDPOINT"] || defaults.api_endpoint,
  }
};

app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
  global.tray = new Tray(path.resolve(__dirname, './assets/tray.png'));

  const win = new electron.BrowserWindow({
    //width: 386,
    //height: 640,
    width: 320,
    height: 568,
    'node-integration': false,
    //transparent: true,
    frame: false,
  });

  win.loadURL(`file://${__dirname}/index.html`);

  //win.webContents.openDevTools();
  win.webContents.on('did-finish-load', () => {
  });

  loadDevtool(loadDevtool.REDUX_DEVTOOLS);
  loadDevtool(loadDevtool.REACT_DEVELOPER_TOOLS);
});

app.setPath("appData",  path.join(__dirname, "./.appData"));
app.setPath("userData", path.join(__dirname, "./.userData"));

