const { execSync } = require('child_process');
const path = require('path');
const meow = require('meow');
const urlParser = require('../util/url-parser');
const { removeQuery } = require('../util/filters');
const { INPUT_TYPES } = require('../util/constants');

module.exports = {
  ffmpegSetup(platform_name) {
    switch (platform_name) {
      case 'win32': {
        try {
          const ffmpeg_paths = execSync('where ffmpeg');
          if (ffmpeg_paths.includes('Could not find file')) {
            process.env.PATH =
              path.resolve(__dirname, 'bin;') + process.env.PATH;
          }
          break;
        } catch (err) {
          console
            .log('Couldn\'t find ffmpeg. Please install https://ffmpeg.org');
        }
        break;
      }
      case 'linux':
      case 'android':
      case 'darwin':

        try {
          const ffmpeg_paths = execSync('which ffmpeg');
          if (ffmpeg_paths == null) {
            console.error('ERROR: Cannot find ffmpeg! Install it first, why dont you read README.md on git!');
            process.exit(-1);
          }
          else {
            execSync('export FFMPEG_PATH=$(which ffmpeg)');
          }

          break;
        } catch (error) {
          console
            .log('Couldn\'t find ffmpeg. Please install https://ffmpeg.org');
        }
    }
  },
  cliInputs() {
    const loginRequired = (flags, input) => {
      if (flags.savedAlbums ||
        flags.savedPlaylists ||
        flags.savedSongs
      ) {
        return true;
      }

      return false;
    };

    const flags = {
      help: {
        alias: 'h',
        helpText: [
          '--help or -h',
          '* returns help',
          'eg. $ spotifydl -h',
        ],
      },
      version: {
        alias: 'v',
        helpText: [
          '--version or -v',
          '* returns the current version',
          'eg. $ spotifydl -v',
        ],
      },
      cacheFile: {
        alias: 'cf',
        type: 'string',
        default: '.spdlcache',
        helpText: [
          '--cache-file "<file-path>" or --cf "<file-path>"',
          '-takes relative or absolute file path argument',
          'eg. $ spotifydl -cf ~/songs.txt <url>',
        ],
      },
      output: {
        alias: 'o',
        type: 'string',
        helpText: [
          '--output "<path>" or -o "<path>"', '-takes valid path argument',
          'eg. $ spotifydl -o ~/songs <url>',
        ],
      },
      extraSearch: {
        alias: 'es',
        type: 'string',
        helpText: [
          '--extra-search "<term>" or --es "<term>"',
          '* takes string for extra search term which gets concated to song search on youtube',
          '* with playlist and albums it will concat with each song.',
          'eg. $ spotifydl <url> --extra-search "lyrics"',
        ],
      },
      username: {
        alias: 'u',
        type: 'string',
        isRequired: loginRequired,
        helpText: [
          '--username "<username>" or -u "<username>"',
          '* takes string for spotify username',
          '* required when using -sa, -sp and -st',
          'NOT SUPPORTED YET',
          'eg. $ spotifydl -u "username"',
        ],
      },
      password: {
        alias: 'p',
        type: 'string',
        isRequired: loginRequired,
        helpText: [
          '--password "<password>" or -p "<password>"',
          '* takes string for spotify password',
          '* required when using -sa, -sp and -st',
          'NOT SUPPORTED YET',
          'eg. $ spotifydl -p "password"',
        ],
      },
      savedAlbums: {
        alias: 'sa',
        helpText: [
          '--saved-albums or --sa',
          '* downloads a users saved albums',
          'NOT SUPPORTED YET',
          'eg. $ spotifydl -u "username" -p "password" -sa',
        ],
      },
      savedPlaylists: {
        alias: 'sp',
        helpText: [
          '--saved-playlists or --sp',
          '* downloads a users saved playlists',
          'NOT SUPPORTED YET',
          'eg. $ spotifydl -u "username" -p "password" -sp',
        ],
      },
      savedTracks: {
        alias: 'st',
        helpText: [
          '--saved-tracks or --st',
          '* downloads a users saved tracks',
          'NOT SUPPORTED YET',
          'eg. $ spotifydl -u "username" -p "password" -st',
        ],
      },
    };

    const helpText = '\n' + Object
      .values(flags)
      .reduce((acc, flag) => `${acc}${flag.helpText.join('\n  ')}\n\n`, '');

    const cli = meow(
      `
      Usage
          $ spotifydl [Options] <link> …
    
      Examples
          $ spotifydl https://open.spotify.com/track/5tz69p7tJuGPeMGwNTxYuV
          $ spotifydl https://open.spotify.com/playlist/4hOKQuZbraPDIfaGbM3lKI
          $ spotifydl https://open.spotify.com/album/32Epx6wQXSulDr24Ez6vTE
          $ spotifydl https://open.spotify.com/artist/3vn7rk7VNMfDhuZNB9sDYP
          $ spotifydl -u username -p password -sa
          $ spotifydl -u username -p password -sp
          $ spotifydl -u username -p password -st
          $ spotifydl <link> -cf <cache-file>
    
      Options
      ${helpText}    
    `,
      {
        flags: flags,
      },
    );

    const { flags: inputFlags } = cli;
    let { input: inputs } = cli;

    inputs = inputs.map(link => {
      const cleanedURL = removeQuery(link);
      return {
        type: urlParser(cleanedURL),
        // only use cleaned url for spotify to not break youtube support
        url: link.includes('spotify') ? cleanedURL : link,
      };
    });

    inputFlags.savedAlbums ?
      inputs.push({ type: INPUT_TYPES.SAVED_ALBUMS, url: null }) : null;
    inputFlags.savedTracks ?
      inputs.push({ type: INPUT_TYPES.SAVED_TRACKS, url: null }) : null;
    inputFlags.savedPlaylists ?
      inputs.push({ type: INPUT_TYPES.SAVED_PLAYLISTS, url: null }) : null;

    if (!inputs.length) {
      console.log('See spotifydl --help for instructions');
      process.exit(1);
    }

    return {
      inputs: inputs,
      extraSearch: inputFlags.extraSearch ? ` ${inputFlags.extraSearch}` : '',
      output: (inputFlags.output != null) ? inputFlags.output : process.cwd(),
      cacheFile: inputFlags.cacheFile,
    };
  },
};