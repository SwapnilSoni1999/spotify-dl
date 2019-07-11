# Spotify Downloader 
<p align="center">
  <img src="./hero.png" height="200px"/>
  <br><br>
  <b>Download audio files from spotify links</b>
  <br>
</p>

&nbsp;

#### Required
Get [FFMPEG](https://ffmpeg.org/download.html) (PS: Not needed for Windows)

#### spotifydl

A simple commandline utility that allows you to download Spotify Songs,Playlist and Albums.


&nbsp;

#### Installation

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

&nbsp;



#### Usage

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
| Flag | Usage | 
| ------ | ------ | 
| -o | takes valid output path argument | 

&nbsp;

#### Acknowledgements

thanks to [icons8](https://icons8.com) for icons in hero image

&nbsp;

#### License

MIT © [Swapnil Soni](https://github.com/SwapnilSoni1999)
