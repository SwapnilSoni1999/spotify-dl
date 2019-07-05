const electron = require('electron');
const path = require('path');
const getLink = require('./../../util/get-link');
const songdata = require('./../../util/get-songdata');
const urlParser = require('./../../util/url-parser');
const filter = require('./../../util/filters');

const download = require('./../../lib/downloader');
const cache = require('./../../lib/cache');
const mergeMetadata = require('./../../lib/metadata');

const ipc = electron.ipcRenderer;

const downloadIt = async (input, outputArg) => {
    try {
        var spotifye = new songdata();
        for (const link of input) {
            const urlType = await urlParser(await filter.removeQuery(link));
            var songData = {};
            const URL = link;
            switch (urlType) {
                case 'song': {
                    songData = await spotifye.getTrack(URL);
                    const songName = songData.name + songData.artists[0];

                    const output = path.resolve(outputArg , await filter.validateOutput(`${songData.name} - ${songData.artists[0]}.mp3`));


                    const youtubeLink = await getLink(songName);


                    await download(youtubeLink, output, spinner, async function () {
                        await mergeMetadata(output, songData, spinner);
                    });
                    break;
                }
                case 'playlist': {
                    var cacheCounter = 0;
                    songData = await spotifye.getPlaylist(URL);
                    var dir = path.join(outputArg , songData.name);


                    cacheCounter = await cache.read(dir, spinner);
                    dir = path.join(dir, '.spdlcache');

                    async function downloadLoop(trackIds, counter) {
                        const songNam = await spotifye.extrTrack(trackIds[counter]);
                        counter++;
                        counter--;

                        const ytLink = await getLink(songNam.name + songNam.artists[0]);

                        const output = path.resolve(outputArg , songData.name, await filter.validateOutput(`${songNam.name} - ${songNam.artists[0]}.mp3`));

                        download(ytLink, output, spinner, async function () {
                            await cache.write(dir, ++counter);
                            await mergeMetadata(output, songNam, spinner, function () {
                                downloadLoop(trackIds, counter);
                            });
                        })

                    }
                    downloadLoop(songData.tracks, cacheCounter);
                    break;
                }
                case 'album': {
                    var cacheCounter = 0;
                    songData = await spotifye.getAlbum(URL);

                    var dir = path.join(outputArg , songData.name);


                    cacheCounter = await cache.read(dir, spinner);
                    dir = path.join(dir, '.spdlcache');

                    async function downloadLoop(trackIds, counter) {
                        const songNam = await spotifye.extrTrack(trackIds[counter]);
                        counter++;
                        counter--;

                        const ytLink = await getLink(songNam.name + songNam.artists[0]);

                        const output = path.resolve(outputArg , songData.name, await filter.validateOutput(`${songNam.name} - ${songNam.artists[0]}.mp3`));

                        download(ytLink, output, spinner, async function () {
                            await cache.write(dir, ++counter);
                            await mergeMetadata(output, songNam, spinner, function () {
                                downloadLoop(trackIds, counter);
                            });
                        })

                    }
                    downloadLoop(songData.tracks, cacheCounter);
                    break;
                }
                case 'artist': {
                    break;
                }
                default: {
                    throw new Error('Invalid URL type');
                }
            }
        }
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}


module.exports = downloadIt;