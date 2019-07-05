const electron = require('electron');
const path = require('path');
const downloadIt = require('./download-it');

const URL = document.getElementById('urlBox');
const choose_file_btn = document.getElementById('choose-file');
const select_path = document.getElementById('select-path');
const output_path = document.getElementById('output-path');
const dload = document.getElementById('daunlood');
//set default os music path
output_path.value = getDefaultMusicFolder(process.platform);

dload.addEventListener('click', function() {
    // document.body.style.overflow = 'auto';
    if(URL.value) {
        console.log(URL.value);

        console.log(output_path.value);

        downloadIt(URL.value, output_path.value);
    }

});
choose_file_btn.addEventListener('click', function() {
    select_path.click();
});

function getDefaultMusicFolder(os) {
    if(os == 'win32') {
        return path.join(process.env.USERPROFILE, 'Music');
    }
    else { //assuming if linux
        return path.join(process.env.HOME, 'Music');
    }
}