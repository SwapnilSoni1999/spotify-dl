const electron = require('electron');
const path = require('path');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let checkerWin;

function createWindow() {
    // Create the browser window.
    checkerWin.close();
    win = new BrowserWindow({ width: 900, height: 780, resizable: false, webPreferences: { nodeIntegration: true } });
    // and load the index.html of the app.
    win.loadFile(path.join(__dirname,'win/main.html'));
    win.removeMenu();
    // Open the DevTools.
    win.webContents.openDevTools();


    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
}

function checkCLI() {
    checkerWin = new BrowserWindow({ width: 300, height:350, resizable: false, frame: false ,webPreferences: { nodeIntegration: true } });

    checkerWin.loadFile(path.join(__dirname, 'win/checker.html'));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', checkCLI);

ipc.on('invalid-url', () => {
    setTimeout(() => {
        win.reload();
        console.log('window reloaded');
    },1500);
});
ipc.on('checking-ok', async () => {
    console.log("Well Done!");    
    createWindow();
});
ipc.on('cli-fail', () => {

});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
})
