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
const versionChecker = require('./util/versionChecker');

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
    },
  }
);

const { input } = cli;

if (!input[0]) {
  console.log('See spotifydl --help for instructions');
  process.exit(1);
}

(async () => {
  const update = await versionChecker();
  if (update) {
    console.log(update);
  }
  const spinner = ora(`Searching…`).start();
  try {
    var spotifye = new songdata();
    for (const link of input) {
      const urlType = await urlParser(await filter.removeQuery(link));
      var songData = {};
      const URL = link;
      let outputDir = path.normalize((cli.flags.output != null) ? cli.flags.output : process.cwd());
      switch(urlType) {
        case 'song': {
          songData = await spotifye.getTrack(URL);
          const songName = songData.name + ' ' + songData.artists[0];
          
          const output = path.resolve(outputDir, await filter.validateOutput(`${songData.name} - ${songData.artists[0]}.mp3`));
          spinner.info(`Saving Song to: ${output}`);

          spinner.succeed(`Song: ${songData.name} - ${songData.artists[0]}`);
          
          const youtubeLink = await getLink(songName);
          spinner.start("Downloading...");
          
          await download(youtubeLink, output, spinner, async function() {
            await mergeMetadata(output, songData, spinner);
          });
          break;
        }
        case 'playlist': {
          var cacheCounter = 0;
          songData = await spotifye.getPlaylist(URL);

          var dir = path.join(outputDir, filter.validateOutputSync(songData.name));
          spinner.info(`Total Songs: ${songData.total_tracks}`)
          spinner.info(`Saving Playlist: ${dir}`);
          
          cacheCounter = await cache.read(dir, spinner);
          dir = path.join(dir, '.spdlcache');
          
          async function downloadLoop(trackIds, counter) {
            const songNam = await spotifye.extrTrack(trackIds[counter]);
            counter++;
            spinner.info(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            counter--;

            const ytLink = await getLink(songNam.name + ' ' + songNam.artists[0]);

            const output = path.resolve(outputDir, filter.validateOutputSync(songData.name), filter.validateOutputSync(`${songNam.name} - ${songNam.artists[0]}.mp3`));
            spinner.start("Downloading...");

            download(ytLink, output, spinner, async function(withError) {
              await cache.write(dir, ++counter);

              if (withError) {
                if(counter == trackIds.length) {
                  console.log(`\nFinished. Saved ${counter} Songs at ${output}.`);
                } else {
                  downloadLoop(trackIds, counter);
                }
              } else {
                await mergeMetadata(output, songNam, spinner, function() {
                  if(counter == trackIds.length) {
                    console.log(`\nFinished. Saved ${counter} Songs at ${output}.`);
                  } else {
                    downloadLoop(trackIds, counter);
                  }
                });
              }
            })

          }
          downloadLoop(songData.tracks, cacheCounter);
          break;
        }
        case 'album': {
          var cacheCounter = 0;
          songData = await spotifye.getAlbum(URL);
          songData.name = songData.name.replace('/', '-');
          
          var dir = path.join(outputDir, await filter.validateOutput(songData.name));

          spinner.info(`Total Songs: ${songData.total_tracks}`);
          spinner.info(`Saving Album: ` + path.join(outputDir, songData.name));

          cacheCounter = await cache.read(dir, spinner);
          dir = path.join(dir, '.spdlcache');

          async function downloadLoop(trackIds, counter) {
            const songNam = await spotifye.extrTrack(trackIds[counter]);
            counter++;
            spinner.info(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            counter--;

            const ytLink = await getLink(songNam.name + ' ' + songNam.artists[0]);

            const output = path.resolve(outputDir, await filter.validateOutput(songData.name, `${songNam.name} - ${songNam.artists[0]}.mp3`));
            spinner.start("Downloading...");

            download(ytLink, output, spinner, async function () {
              await cache.write(dir, ++counter);

              await mergeMetadata(output, songNam, spinner, function() {
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
          spinner.warn("To download artists list, add them to a separate Playlist and download.");
          break;
        }
        default: {
          throw new Error('Invalid URL type');
        }
      }
    }
  } catch (error) {
    spinner.fail(`Something went wrong!`);
    console.log(error);
    process.exit(1);
  }
})();

process.on('SIGINT', () => {
  process.exit(1);
});
