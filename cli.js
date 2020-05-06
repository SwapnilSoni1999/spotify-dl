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
  const spinner = ora(`Searching…`).start();
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
          spinner.warn("Warning: Providing Playlist will download first 100 songs from the list. This is a drawback right now and will be fixed later.");
          var dir = path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name);
          
          spinner.info(`Saving Playlist: ` + path.join( (cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name));
          
          cacheCounter = await cache.read(dir, (cli.flags.spin == true) ? spinner : null);
          dir = path.join(dir, '.spdlcache');
          
          async function downloadLoop(trackIds, counter) {
            const songNam = await spotifye.extrTrack(trackIds[counter]);
            counter++;
            spinner.info(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            counter--;

            const ytLink = await getLink(songNam.name + songNam.artists[0]);

            const output = path.resolve((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name, await filter.validateOutput(`${songNam.name} - ${songNam.artists[0]}.mp3`));
            spinner.start("Downloading...");

            download(ytLink, output, spinner, async function() {
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
        case 'album': {
          var cacheCounter = 0;
          songData = await spotifye.getAlbum(URL);
          songData.name = songData.name.replace('/', '-');
          
          var dir = path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name);

          spinner.info(`Saving Album: ` + path.join((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name));

          cacheCounter = await cache.read(dir, (cli.flags.spin == true) ? spinner : null);
          dir = path.join(dir, '.spdlcache');

          async function downloadLoop(trackIds, counter) {
            const songNam = await spotifye.extrTrack(trackIds[counter]);
            counter++;
            spinner.info(`${counter}. Song: ${songNam.name} - ${songNam.artists[0]}`);
            counter--;

            const ytLink = await getLink(songNam.name + songNam.artists[0]);

            const output = path.resolve((cli.flags.output != null) ? cli.flags.output : process.cwd(), songData.name, await filter.validateOutput(`${songNam.name} - ${songNam.artists[0]}.mp3`));
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
