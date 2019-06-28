const { execSync } = require('child_process');
const path = require('path');

module.exports = {
    ffmpeg(platform_name) {
        switch (platform_name) {
            case 'win32': {
                const ffmpeg_paths = execSync('where ffmpeg');
                if (ffmpeg_paths.includes("Could not find file")) {
                    process.env.PATH = path.resolve(__dirname, 'bin;') + process.env.PATH;
                }
                break;
            }
            case 'linux':
            case 'android':
            case 'darwin':
                
                const ffmpeg_paths = execSync('which ffmpeg');
                if(ffmpeg_paths == null) {
                    console.error('ERROR: Cannot find ffmpeg! Install it first, why dont you read README.md on git!');
                    process.exit(-1);
                }
                else {
                    execSync(`export FFMPEG_PATH=$(which ffmpeg)`);
                }

                break;
        
            default: {
                break;
            }
        }
    }
}