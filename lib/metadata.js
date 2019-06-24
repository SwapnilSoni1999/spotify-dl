'use strict';
const ffmetadata = require('ffmetadata');
const fs = require('fs');
const request = require('request');

const getCover = function (uri, filename, callback) {
    request.head(uri, function (err, res, body) {

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

const mergeMetadata = async (output, songdata, spinner, callback) => {
    console.log("ouuutt", output);
    const cover = output.slice(0, output.length - 3) + 'jpg';
    getCover(songdata.cover_url, cover, function() {
        var metadata = {
            artist: songdata.artists,
            album: songdata.album_name,
            title: songdata.name,
            date: songdata.release_date,
            attachments: [cover]
        };
        ffmetadata.write(output, metadata, {}, function(err) {
            if(err) {
                throw new Error('Error writing Metadata!',err);
            }
            else {
                spinner.info('Metadata Merged!');
                fs.unlinkSync(cover);
                if (typeof callback === "function") callback();
                return;
            }
        });
    });
};

module.exports = mergeMetadata;