# Spotify Downloader 
<p align="center">
  <img src="./hero.png" height="200px"/>
  <br><br>
  <b>Download audio files from spotify links</b>
  <br>
</p>

&nbsp;

#### Required
Get [FFMPEG](https://ffmpeg.org/download.html)

#### spotifydl

A simple commandline utility that allows you to download Spotify Songs,Playlist and Albums from Youtube.

<hr>

# Installation

#### NPM

Install from [npm](https://www.npmjs.com/package/spotify-dl) registry

```sh
npm install -g spotify-dl
```
or You can do manually
```sh
git clone https://github.com/SwapnilSoni1999/spotify-dl
cd spotify-dl
npm install
npm link
```

#### Android (Termux)
PS: You may need to type `termux-setup-storage` first and allow storage permission
```sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/SwapnilSoni1999/spotify-dl/master/tools/termux.sh)"
```

#### Docker

Build docker image:
```sh
git clone https://github.com/SwapnilSoni1999/spotify-dl
cd spotify-dl
docker build -t spotify-dl .
```

<hr>

# Usage

To download highest quality audio file
```sh
spotifydl <spotify track/album/playlist link> ...
```

&nbsp;

Example
```sh
$ spotifydl https://open.spotify.com/track/xyz

```

#### Options
| Flag | Usage                                                        |
| ---- | ------------------------------------------------------------ |
| -o   | takes valid output path argument                             |
| --es | takes extra search string/term to be used for youtube search |
| --oo | enforces all downloaded songs in the output dir              |
| --st | download spotify saved tracks                                |
| --sp | download spotify saved playlists                             |
| --sa | download spotify saved albums                                |
| -u   | spotify username (only needed in non tty)                    |
| -p   | spotify password (only needed in non tty)                    |
| -cf  | takes valid output file name path argument                   |
| -v   | returns current version                                      |
| -h   | outputs help text                                            |
<hr>

## Docker
```sh
docker run -it --user=$(id -u):$(id -g) -v $(pwd):/download --rm spotify-dl <options-to-spotify-dl defaults to --help>
docker run -it --user=$(id -u):$(id -g) -v $(pwd):/download --rm spotify-dl "https://open.spotify.com/...."
```

#### Acknowledgements

thanks to [icons8](https://icons8.com) for icons in hero image
and all the contributors for PR, suggestions and testing :love:

&nbsp;

#### License

MIT © [Swapnil Soni](https://github.com/SwapnilSoni1999)
