const songdata = require('./get-songdata');
const path = require('path');
const getLink = require('./get-link');

const download = require('./../lib/downloader');
var spotifye = new songdata();

const playlistDownload = async (trackArray, counter, spinner) => {
    var trackData = await spotifye.extrTrack(trackArray[counter]);
    var songName = trackData.name + trackData.artists[0];
    counter++;
    spinner.succeed(`${counter}: ${trackData.name} - ${trackData.artists[0]}`);
    counter--;
    var output = path.resolve(__dirname, `../${trackData.name} - ${trackData.artists[0]}.mp3`);
    var youtubeLink = await getLink(songName);
    await download(youtubeLink, output, spinner, trackArray, counter);
}

module.exports = playlistDownload;