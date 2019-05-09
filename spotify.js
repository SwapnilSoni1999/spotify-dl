const ytSearch = require('yt-search');
const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const ytdl = require('@microlink/youtube-dl');
const path = require('path');
const _cliProgress = require('cli-progress');


var GLOBAL_ARGS = [
    '-s', '--song',
    '-a', '--album',
    '-p', '--playlist'
];
var FLAGS = {
    _SONG: '--song', _S: '-s',
    _ALBUM: '--album', _A: '-a',
    _PLAYLIST:'--playlist', _P: '-p'
};

var RES = {};
var ONE_ARG=false, EK_BARI=false;
process.argv.forEach(function (val, index, array) {
    if(!EK_BARI) {        
        if(!ONE_ARG) {
            var res;
            // console.log("sed");
            res = validArg(val);  
            RES = res;
            ONE_ARG = res.bool;
            // console.log(res.ARG);
        }
        else {
            EK_BARI = true;
            var len = array.length;
            len--;
            // console.log("else ",array[len]);
            //perform on url
            var spotifyURL = array[len];
            if(validURL(spotifyURL)) {
                // console.log("Valid URL");
                if(spotifyURL.includes("/track/") ||
                    spotifyURL.includes("/playlist/") ||
                    spotifyURL.includes("/album/") ) 
                    {
                        //console.log("Valid Spotify URL");
                        // console.log(RES);
                        
                        if (spotifyURL.includes("/track/") && RES.ARG === 'song') {
                            request({ url:spotifyURL, json: true}, function(error, response, body) {
                                // console.log(body);
                                var $ = cheerio.load(body);
                                var trackInfo = {
                                    title: '',
                                    artist: ''
                                } 
                                trackInfo.title = $("#body > div.page > header > div.wrapper.padding-notch > div.entity.full-width > div.entity-info.media > div.media-bd > h1").text();
                                trackInfo.artist = $("#body > div.page > header > div.wrapper.padding-notch > div.entity.full-width > div.entity-info.media > div.media-bd > h2").text();
                                trackInfo.artist = trackInfo.artist.slice(3);
                                // console.log($('script').text());
                                console.log("Song :", trackInfo.title);
                                console.log("Artist :", trackInfo.artist);
                                ytSearch(trackInfo.title + trackInfo.artist, function(err, r) {
                                    if(err) throw err

                                    const videos = r.videos;
                                    var yt_lenk = 'https://youtube.com' + videos[0].url;
                                    //console.log("Found :",yt_lenk);
                                    downlaodFile(yt_lenk);
                                }); 
                                // console.log($('title').text());
                            });
                        }
                        else {
                            console.error("Error: -s or --song requires a spotify Track URL.");
                        }
                }
                else {
                    console.error("Error: Invalid Spotify URL");
                    process.exit(-1);
                }
            }
            else {
                console.error("Error: Invalid URL");
                process.exit(-1);
            }
    
        }
    }
    // console.log(index + ': ' + val);
    // console.log(ONE_ARG);
});


function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}

function downlaodFile(ytLink) {
    const bar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);
    

    var size = 0;
    var song = ytdl(ytLink, ['-f', 'bestaudio','-x', '--audio-format', 'mp3', '--audio-quality', '0']);
    song.on('info', function (info) {
        'use strict';
        // console.log("Downloading :", info._filename);
        console.log("Size :",bytesToSize(info.size));
        size = info.size;
        var file = path.join(__dirname, info.fulltitle);
        file += '.mp3'; 
        console.log("Downloading :", info.fulltitle + '.mp3');
        bar.start(100, 0);
        song.pipe(fs.createWriteStream(file));
    });

    var pos = 0;
    song.on('data', function data(chunk) {
        'use strict';
        pos += chunk.length;

        // `size` should not be 0 here.
        if (size) {
            var percent = (pos / size * 100).toFixed(2);
            bar.update(percent);
            // process.stdout.cursorTo(0);
            // process.stdout.clearLine(1);
            // process.stdout.write(percent + '%');
        }
    });

    song.on('end', function end() {
        // 'use strict';
        bar.stop();
        console.log('Finished!');
    });
}

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}




function validArg(arg) {
    // console.debug("Recieved arg:",arg);
    let found = {
        bool: false,
        ARG: ''
    };
    for(let i=0; i<GLOBAL_ARGS.length; i++) {
        // console.debug("loop:",GLOBAL_ARGS[i]);
        if(arg == GLOBAL_ARGS[i]) {
            // console.log("Valid arg found!");
            if(arg == FLAGS._SONG || arg == FLAGS._S) {
                found.ARG = 'song';
            } else if (arg == FLAGS._ALBUM || arg == FLAGS._A) {
                found.ARG = 'album';
            } else if (arg == FLAGS._PLAYLIST || arg == FLAGS._P) {
                found.ARG = 'playlist';
            }
            found.bool = true;
        }
    }
    // console.log(found);
    return found;
}
