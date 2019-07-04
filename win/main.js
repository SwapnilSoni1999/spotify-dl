const electron = require('electron');
const path = require('path');

const URL = document.getElementById('urlBox');
const choose_file_btn = document.getElementById('choose-file');
const select_path = document.getElementById('select-path');
const output_path = document.getElementById('output-path');
//set default os music path
output_path.value = getDefaultMusicFolder(process.platform);


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