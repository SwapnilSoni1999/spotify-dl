const ipc = require('electron').ipcRenderer;
const path = require('path');
const exec = require('child_process').exec;
const urlParse = require('./../../util/url-parser');

const URL = document.getElementById('urlBox');
const choose_file_btn = document.getElementById('choose-file');
const select_path = document.getElementById('select-path');
const output_path = document.getElementById('output-path');
const dload = document.getElementById('daunlood');
//set default os music path
output_path.value = getDefaultMusicFolder(process.platform);
var counter = 0, ONE_TIME = false;

dload.addEventListener('click', function() {
    if(URL.value) {
        console.log("Clicked!");
        var progress;
        const spotifydl = exec(`spotifydl ${URL.value} -o ${output_path.value} -s false`);
        var execCounts = 0;
        spotifydl.stdout.on('data',async (data) => {
            const urlType = await urlParse(URL.value);
            if(urlType == 'song') {
                execCounts++;
                if(data.includes('Song:')) {
                    // console.log(data.split(' '));
                    await appendCard(counter);
                    var songName = await getSong(data.split(' '));
                    var outputName = await getOutput(output_path.value, songName);
                    await setSong(songName, outputName, counter);
                }
                if(data.includes('Downloading')) {
                    if(execCounts < 5) {
                        var total_size = data.split(' ')[3];
                        console.log(total_size);
                        await setTotal(total_size, counter);
                    }
                    progress = await getProgress(data.split(' '));
                    await updateProgress(progress, counter);
                }
                if(data.includes("complete")) {
                    console.log("Thai gyu download");
                    counter++;
                }
            }
            else {
                if(!ONE_TIME) {
                    ONE_TIME = true;
                    const template = `
                                        <div class="text-center"><h4><b>Only Track URL is valid for input.</b></h4></div>
                                    `;
    
                    document.getElementById('output-container').innerHTML += template;
                    document.body.style.overflow = 'auto';
                    ipc.send('invalid-url');
                }
            }
        });

    }

});
choose_file_btn.addEventListener('click', function() {
    select_path.click();
});

async function updateProgress(progress, counter) {
    const curr_card = document.getElementsByClassName('out-of');
    curr_card[counter].innerHTML = progress;

    const totul = document.getElementsByClassName('totul')[counter].innerHTML;
    var percentage = await getPercentage(parseFloat(progress, 10), parseFloat(totul, 10));
    // console.log(percentage);
    document.getElementsByClassName('progress-bar')[counter].style.width = percentage + '%';
}

async function getPercentage(current, total) {
    return (current/total) * 100;
}

async function setTotal(total, counter) {
    console.log("counter:",counter);
    const curr_card = document.getElementsByClassName('totul');
    curr_card[counter].innerHTML = total;
}

async function setSong(nam, out, counter) {
    console.log("Counter:",counter);
    const curr_card = document.getElementById(counter);
    curr_card.children[0].children[0].children[1].innerHTML = nam;
    curr_card.children[0].children[2].innerHTML = out;
}

async function appendCard(id) {
    var template = `
                <div class="card" id=${id} style="margin-bottom: 40px;">
                    <div class="card-body">
                        <div class="d-inline-block">
                            <i class="fas fa-music d-inline"></i>
                            <h6 class="card-title d-inline" style="margin-top: 0px; padding-left: 8px"></h6>
                        </div>
                        <small class="card-subtitle d-block mt-2 text-muted">
                            Downloaded <span class="out-of"></span> of <span class="totul"></span>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar" role="progressbar" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </small>
                        <p class="card-text"></p>
                    </div>
                </div>
                   `;
    document.getElementById('output-container').innerHTML += template;
    document.body.style.overflow = 'auto';
}

async function getProgress(dloadArr) {
    return dloadArr[1];
}

async function getOutput(pathh, name) {
    var name = path.join(pathh, name);
    name = name.slice(0, name.length -2) + '.mp3'; 
    return name;
}

async function getSong(arr) {
    console.log(arr);
    let chunk = '';
    for(var i=0; i<arr.length; i++) {
        if(arr[i].includes('Song:')) {
            for(var j=++i; j<arr.length; j++) {
                chunk += arr[j] + ' ';
            }
        }
    }
    return chunk;
}

function getDefaultMusicFolder(os) {
    if(os == 'win32') {
        return path.join(process.env.USERPROFILE, 'Music');
    }
    else { //assuming if linux
        return path.join(process.env.HOME, 'Music');
    }
}