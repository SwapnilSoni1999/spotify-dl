#!/usr/bin/env node

/*
  Copyright (c) 2019 Swapnil Soni

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
*/

// [TempFix] Fix include by copying lib folder from dist->lib (check: https://github.com/fent/node-ytdl-core/pull/520)
try {
  const execSync = require('child_process').execSync;
  const plat = process.platform;
  if(plat === 'android') {
    execSync('cp -r /data/data/com.termux/files/usr/lib/node_modules/spotify-dl/node_modules/m3u8stream/dist /data/data/com.termux/files/usr/lib/node_modules/spotify-dl/node_modules/m3u8stream/lib')
  }
  else if(plat == 'linux' || plat == 'darwin') {
    execSync('cp -r /usr/lib/node_modules/spotify-dl/node_modules/m3u8stream/dist /usr/lib/node_modules/spotify-dl/node_modules/m3u8stream/lib')
  }
} catch(err) {
  console.error('Please report issue on Github. https://github.com/SwapnilSoni1999/spotify-dl/issues');
  process.exit(-1);
}

const path = require('path');
const ora = require('ora');
const meow = require('meow');
const getLink = require('./util/get-link');
const songdata = require('./util/get-songdata');
const urlParser = require('./util/url-parser');
const filter = require('./util/filters');

const download = require('./lib/downloader');
const cache = require('./lib/cache');
const mergeMetadata = require('./lib/metadata');
const setup = require('./lib/setup');

// setup ffmpeg
setup.ffmpeg(process.platform);

const cli = meow(
  `
  Usage
      $ spotifydl [Options] <link> …

  Examples
      $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
      $ spotifydl https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI

  Options
    -o    -takes valid path argument 
          eg. $ spotifydl -o ~/songs https://open.spotify.com/playlist/3PrZvfOSNShOC2JxgIhvL1
`,
  {
    flags: {
      help: {
        alias: 'h',
      },
      version: {
        alias: 'v',
      },
      output: {
        alias: 'o',
        type: 'string'
      },
      spin: {
        alias:'s',
        type: 'boolean',
        default: true
      }
    },
  }
);

const { input } = cli;
var spinner;
if (!input[0]) {
  console.log('See spotifydl --help for instructions');
  process.exit(1);
}

(async () => {
  if (cli.flags.spin == true) {
    spinner = ora(`Searching…`).start();
  }
  else if (cli.flags.spin == false) {
    console.log("Spinner is disabled: Remove flag -s false to enable!");
  }
  try {
    var spotifye = new songdata();
    for (const link of input) {
      const urlType = await urlParser(await filter.removeQuery(link));
      var songData = {};
      const URL = link;
      switch(urlType) {
        case 'song': {
          songData = await spotifye.getTrack(URL);
          const songName = songData.name + songData.artists[0];
          
          const output = path.resolve((cli.flags.output != null) ? cli.flags.output : process.cwd(), await filter.validateOutput(`${songData.name} - ${songData.artists[0]}.mp3`));
          if(cli.flags.spin == true) {
            spinner.info(`Saving Song to: ${output}\n`);
          } else if(cli.flags.spin == false) {
            console.log(`Saving Song to: ${output}\n`);
          }

          if(cli.flags.spin == true) {
            spinner.succeed(`Song: ${songData.name} - ${songData.artists[0]}`);
          } else if(cli.flags.spin == false) {
            console.log(`Song: ${songData.name} - ${songData.artists[0]}`);
          }
          
          const youtubeLink = await getLink(songName);

          if(cli.flags.spin == true) {
            spinner.start("Downloading...");
          } else if(cli.flags.spin == false) {
            console.log("Downloading...");
          }
          
          await download(youtubeLink, output, (cli.flags.spin == true) ? spinner : null, async function() {
            await mergeMetadata(output, songData, (cli.flags.spin == true) ? spinner : null);
          });
          break;
        }
        case 'playlist': {
          var cacheCounter = 0;
          songData = await spotifye.getPlaylist(URL);
          if(cli.flags.spin == true) {
            spinner.warn("Warning: Providing Playlist will download first 100 songs from the list. This is a drawback right now and will be fixed later.");
          } else if(cli.flags.spin == false) {
            console.log("Warning: Providing Playlist will download first 100 songs from the list. This is a drawback right now and will be fixed later.");
          }
          var dir = path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name);
          
          if(cli.flags.spin == true) {
            spinner.info(`Saving Playlist: ` + path.join( (cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name));
          } else if(cli.flags.spin == false) {
            console.log(`Saving Playlist: ` + path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name));
          }
          
          cacheCounter = await cache.read(dir, (cli.flags.spin == true) ? spinner : null);
          dir = path.join(dir, '.spdlcache');
          
          async function downloadLoop(trackIds, counter) {
            const songNam = await spotifye.extrTrack(trackIds[counter]);
            counter++;
            if(cli.flags.spin == true) {
              spinner.info(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            } else if(cli.flags.spin == false) {
              console.log(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            }
            counter--;

            const ytLink = await getLink(songNam.name + songNam.artists[0]);

            const output = path.resolve((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name, await filter.validateOutput(`${songNam.name} - ${songNam.artists[0]}.mp3`));
            if(cli.flags.spin == true) {
              spinner.start("Downloading...");
            } else if(cli.flags.spin == false) {
              console.log("Downloading...");
            }

            download(ytLink, output, (cli.flags.spin == true) ? spinner : null, async function() {
              await cache.write(dir, ++counter);
              await mergeMetadata(output, songNam, (cli.flags.spin == true) ? spinner : null, function() {
                if(counter == trackIds.length) {
                  console.log(`\nFinished. Saved ${counter} Songs at ${output}.`);
                } else {
                  downloadLoop(trackIds, counter);
                }
              });
            })

          }
          downloadLoop(songData.tracks, cacheCounter);
          break;
        }
        case 'album': {
          var cacheCounter = 0;
          songData = await spotifye.getAlbum(URL);
          songData.name = songData.name.replace('/', '-');
          
          var dir = path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name);

          if(cli.flags.spin == true) {
            spinner.info(`Saving Album: ` + path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name));
          } else if(cli.flags.spin == false) {
            console.log(`Saving Album: ` + path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name));
          }

          cacheCounter = await cache.read(dir, (cli.flags.spin == true) ? spinner : null);
          dir = path.join(dir, '.spdlcache');

          async function downloadLoop(trackIds, counter) {
            const songNam = await spotifye.extrTrack(trackIds[counter]);
            counter++;
            if(cli.flags.spin == true) {
              spinner.info(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            } else if(cli.flags.spin == false) {
              console.log(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            }
            counter--;

            const ytLink = await getLink(songNam.name + songNam.artists[0]);

            const output = path.resolve((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name, await filter.validateOutput(`${songNam.name} - ${songNam.artists[0]}.mp3`));
            if(cli.flags.spin == true) {
              spinner.start("Downloading...");
            } else if(cli.flags.spin == false) {
              console.log("Downloading...");
            }

            download(ytLink, output, (cli.flags.spin == true) ? spinner : null, async function () {
              await cache.write(dir, ++counter);
              await mergeMetadata(output, songNam, (cli.flags.spin == true) ? spinner : null, function() {
                if(counter == trackIds.length) {
                  console.log(`\nFinished. Saved ${counter} Songs at ${output}.`);
                } else {
                  downloadLoop(trackIds, counter);
                }
              });
            })

          }
          downloadLoop(songData.tracks, cacheCounter);
          break;
        }
        case 'artist': {
          if(cli.flags.spin == true) {
            spinner.warn("To download artists list, add them to a separate Playlist and download.");
          } else if(cli.flags.spin == false) {
            console.log("To download artists list, add them to a separate Playlist and download.");
          }
          break;
        }
        default: {
          throw new Error('Invalid URL type');
        }
      }
    }
  } catch (error) {
    console.log(`Something went wrong!`);
    console.log(error);
    process.exit(1);
  }
})();

process.on('SIGINT', () => {
  process.exit(1);
});
