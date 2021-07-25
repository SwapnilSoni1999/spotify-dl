const { execSync } = require('child_process');
const path = require('path');
const meow = require('meow');
const urlParser = require('../util/url-parser');
const { removeQuery } = require('../util/filters');
const { INPUT_TYPES } = require('../util/constants');
const config = require('../config');
const versionChecker = require('../util/version-checker');
const { logFailure } = require('../util/log-helper');

const ffmpegSetup = function (platform_name) {
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
        logFailure(
          'Couldn\'t find ffmpeg. Please install https://ffmpeg.org',
        );
      }
      break;
    }
    case 'linux':
    case 'android':
    case 'darwin':

      try {
        const ffmpeg_paths = execSync('which ffmpeg');
        if (ffmpeg_paths == null) {
          logFailure('ERROR: Cannot find ffmpeg! Install it first, \
           why don\'t you read README.md on git!');
          process.exit(-1);
        }
        else {
          execSync('export FFMPEG_PATH=$(which ffmpeg)');
        }

        break;
      } catch (error) {
        logFailure(
          'Couldn\'t find ffmpeg. Please install https://ffmpeg.org',
        );
      }
  }
};

module.exports = {
  ffmpegSetup,
  startup() {
    // setup ffmpeg
    ffmpegSetup(process.platform);
    process.on('SIGINT', () => {
      process.exit(1);
    });
    versionChecker();
  },
  cliInputs() {
    const loginRequired = (flags, _input) => {
      if ((flags.savedAlbums ||
        flags.savedPlaylists ||
        flags.savedShows ||
        flags.savedSongs) && !process.stdout.isTTY
      ) {
        return true;
      }

      return false;
    };

    const flagsConfig = config.flags;

    // if you add a new flag make sure to add the default to the config
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
        default: flagsConfig.cacheFile,
        helpText: [
          '--cache-file "<file-path>" or --cf "<file-path>"',
          '-takes relative or absolute file path argument',
          'eg. $ spotifydl -cf ~/songs.txt <url>',
        ],
      },
      cookieFile: {
        alias: 'cof',
        type: 'string',
        default: flagsConfig.cookieFile,
        helpText: [
          '--cookie-file "<file-path>" or --cof "<file-path>"',
          '-takes relative or absolute file path argument',
          '- defaults to cookies.txt',
          'eg. $ spotifydl -cof ~/cookies.txt <url>',
        ],
      },
      downloadReport: {
        alias: 'dr',
        type: 'boolean',
        default: flagsConfig.downloadReport,
        helpText: [
          '--download-report or --dr',
          '-displays an output at the end of all failed items',
          'NOTE: uses alot of ram',
          '-defaults to false',
          'eg. $ spotifydl -cof ~/cookies.txt <url>',
        ],
      },
      output: {
        alias: 'o',
        type: 'string',
        default: flagsConfig.output,
        helpText: [
          '--output "<path>" or -o "<path>"', '-takes valid path argument',
          'eg. $ spotifydl -o ~/songs <url>',
        ],
      },
      extraSearch: {
        alias: 'es',
        type: 'string',
        default: flagsConfig.extraSearch,
        helpText: [
          '--extra-search "<term>" or --es "<term>"',
          '* takes string for extra search term which gets combined \
            to the song search on youtube',
          '* with playlist and albums it will concat with each song.',
          'eg. $ spotifydl <url> --extra-search "lyrics"',
        ],
      },
      username: {
        alias: 'u',
        type: 'string',
        default: flagsConfig.username,
        isRequired: loginRequired,
        helpText: [
          '--username "<username>" or -u "<username>"',
          '* takes string for spotify username',
          '* optional when tty',
          '* required when using -sa, -sp and -st in non tty',
          'eg. $ spotifydl -u "username"',
        ],
      },
      password: {
        alias: 'p',
        type: 'string',
        default: flagsConfig.password,
        isRequired: loginRequired,
        helpText: [
          '--password "<password>" or -p "<password>"',
          '* takes string for spotify password',
          '* optional when tty',
          '* required when using -sa, -sp and -st in non tty',
          'eg. $ spotifydl -p "password"',
        ],
      },
      savedAlbums: {
        alias: 'sa',
        type: 'boolean',
        default: flagsConfig.savedAlbums,
        helpText: [
          '--saved-albums or --sa',
          '* downloads a users saved albums',
          '* username and password required for non TTY',
          'eg. $ spotifydl -u "username" -p "password" -sa',
          'eg. $ spotifydl -sa',
        ],
      },
      savedShows: {
        alias: 'ss',
        type: 'boolean',
        default: flagsConfig.savedShows,
        helpText: [
          '--saved-shows or --ss',
          '* downloads a users saved shows',
          '* username and password required for non TTY',
          'eg. $ spotifydl -u "username" -p "password" -ss',
          'eg. $ spotifydl -ss',
        ],
      },
      savedPlaylists: {
        alias: 'sp',
        type: 'boolean',
        default: flagsConfig.savedPlaylists,
        helpText: [
          '--saved-playlists or --sp',
          '* downloads a users saved playlists',
          '* username and password required for non TTY',
          'eg. $ spotifydl -u "username" -p "password" -sp',
          'eg. $ spotifydl -sp',
        ],
      },
      savedTracks: {
        alias: 'st',
        type: 'boolean',
        default: flagsConfig.savedTracks,
        helpText: [
          '--saved-tracks or --st',
          '* downloads a users saved tracks',
          '* username and password required for non TTY',
          'eg. $ spotifydl -st',
          'eg. $ spotifydl -u "username" -p "password" -st',
        ],
      },
      outputOnly: {
        alias: 'oo',
        default: flagsConfig.outputOnly,
        type: 'boolean',
        helpText: [
          '--outputOnly or --oo',
          '* saves all songs directly to the output dir',
          'eg. $ spotifydl -oo',
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
          $ spotifydl -sp
          $ spotifydl -st
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

    if (inputFlags.savedAlbums) {
      inputs.push({ type: INPUT_TYPES.SONG.SAVED_ALBUMS, url: null });
    }
    if (inputFlags.savedTracks) {
      inputs.push({ type: INPUT_TYPES.SONG.SAVED_TRACKS, url: null });
    }
    if (inputFlags.savedPlaylists) {
      inputs.push({ type: INPUT_TYPES.SONG.SAVED_PLAYLISTS, url: null });
    }
    if (inputFlags.savedShows) {
      inputs.push({ type: INPUT_TYPES.EPISODE.SAVED_SHOWS, url: null });
    }

    if (!inputs.length) {
      console.log('See spotifydl --help for instructions');
      process.exit(1);
    }

    return {
      inputs: inputs,
      extraSearch: inputFlags.extraSearch,
      output: inputFlags.output,
      cacheFile: inputFlags.cacheFile,
      cookieFile: inputFlags.cookieFile,
      downloadReport: inputFlags.downloadReport,
      outputOnly: inputFlags.outputOnly,
      username: inputFlags.username,
      password: inputFlags.password,
    };
  },
};