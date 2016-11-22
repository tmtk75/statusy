const path     = require("path");
const defaults = require("./assets/defaults");
const { app, BrowserWindow, Tray, Menu } = require('electron');

const debug = process.env["DEBUG"];

global.config = {
  github: {
    token: process.env["GITHUB_TOKEN"],
  },
  kiicloud: {
    appID:  process.env["KII_APP_ID"] || defaults.app_id,
    appKey: process.env["KII_APP_KEY"] || defaults.app_key,
    apiEndpoint: process.env["KII_API_ENDPOINT"] || defaults.api_endpoint,
  },
  debug,
};

app.on('window-all-closed', () => {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
  global.tray = new Tray(path.resolve(__dirname, './assets/tray.png'));

  const win = new BrowserWindow({
    //width: 386,
    //height: 640,
    width: 320,
    height: 568,
    resizable: false,
    'node-integration': false,
    //transparent: true,
    frame: false,
  });

  win.loadURL(`file://${__dirname}/index.html`);

  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    //label: "Application",
    submenu: [
      //{ label: "About Application", selector: "orderFrontStandardAboutPanel:" },
      //{ type: "separator" },
      { label: "Quit", accelerator: "Command+Q", click: () => app.quit()}
    ]}, {
    label: "Edit",
    submenu: [
      { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
      { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
      { type: "separator" },
      { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
      { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
      { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
      { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]}
  ]))

  //win.webContents.openDevTools();
  win.webContents.on('did-finish-load', () => {
  });

  if (global.config.debug) {
    const loadDevtool = require('electron-load-devtool');
    loadDevtool(loadDevtool.REDUX_DEVTOOLS);
    loadDevtool(loadDevtool.REACT_DEVELOPER_TOOLS);
  }
});

if (debug) {
  const dataDirSuffix = (process.env["DATA_DIR_SUFFIX"] || "")
  app.setPath("appData",  path.join(__dirname, "./.appData" + dataDirSuffix));
  app.setPath("userData", path.join(__dirname, "./.userData" + dataDirSuffix));
}

console.log("appData path:", app.getPath("appData"));
console.log("userData path:", app.getPath("userData"));
