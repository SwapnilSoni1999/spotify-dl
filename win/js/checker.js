const ipc = require('electron').ipcRenderer;
const { exec } = require('child_process');

const close_btn = document.getElementById('close-btn');
close_btn.style.visibility = 'hidden';
const status_box = document.getElementById('status-box');

async function check() {
    message('Checking if NodeJs is installed or not...');
    if(await isNodeInstalled()) {
        message(`Checking CLI is installed or not...`);
        if (await isCliInstalled()) {
            message("Launching application !!!");
            // remote.getCurrentWindow().close();
            ipc.send('checking-ok');
        } else {

        }
    } else {
        close_btn.style.visibility = 'visible';
        message(`WARNING: NodeJs is not installed! Please install`);
    }
}

function message(msg) {
    status_box.innerText = msg;
}

async function isCliInstalled() {
    const spotifydl = exec('spotifydl');
    return spotifydl.stdout.on('data', (data) => {
        if(data.includes('See spotifydl --help')) {
            message('Found spotifydl CLI!');
            return true;
        } else {
            return false;
        }
    });
}
async function isNodeInstalled() {
    const nodejs = exec('npm --version');
    return nodejs.stdout.on('data', (data) => {
        if(data.length > 5) {
            message(`Found NodeJS, Version: ${data}`);
            return true;
        } else {
            return false;
        }
    });
}

check();
