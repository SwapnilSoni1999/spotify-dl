'use strict';
const ffmetadata = require('ffmetadata');
const fs = require('fs');
const axios = require('axios').default;
const ffmpeg = require('fluent-ffmpeg');

const getCover = function (uri, filename, callback) {
    const writer = fs.createWriteStream(filename);
    axios({
        method: 'GET',
        url: uri,
        responseType: 'stream'
    }).then(res => {
        res.data.pipe(writer);
        writer.on('close', callback);
    });
};

const mergeMetadata = async (output, songdata, spinner, callback) => {
    const cover = output.slice(0, output.length - 3) + 'jpg';
    getCover(songdata.cover_url, cover, function() {
        var metadata = {
            artist: songdata.artists,
            album: songdata.album_name,
            title: songdata.name,
            date: songdata.release_date,
            attachments: [cover]
        };
        
        // execSync(`ffmpeg -y -i \"${output}\" -i \"${cover}\" -c:a copy -c:v copy -map 0:0 -map 1:0 -id3v2_version 3 -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)" \"${output}\"`);
        ffmetadata.write(output, metadata, {}, function(err) {
            if(err) {
                spinner.fail("Something went wrong - couldn't merge metadata");
                return callback();
            } else if (spinner) {
                const tempPath = output.slice(0, output.length - 3) + 'temp.mp3'
                const stream = ffmpeg(output).addOutputOptions('-i', cover, '-map', '0:0', '-map', '1:0', '-c', 'copy', '-id3v2_version', '3').save(tempPath);
                stream
                    .on('end', () => {
                        fs.unlinkSync(output);
                        fs.renameSync(tempPath, output);
                        fs.unlinkSync(cover);
                        spinner.succeed('Metadata Merged!');
                        if (typeof callback === "function") callback();
                    });
            }
        });
    });
};

module.exports = mergeMetadata;