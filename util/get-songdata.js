'use strict';
const spotify = require('../lib/api');

class SpotifyExtractor {
  async getTrack(url) {
    const ID = await this.getID(url);
    return this.extractTrack(ID);
  }

  async getAlbum(url) {
    const ID = await this.getID(url);
    return this.extractAlbum(ID);
  }
  async getArtistAlbums(url) {
    const artistID = await this.getID(url);
    const albumsResult = await spotify.extractAlbumsForArtist(artistID)
    const albums = albumsResult.body.items
    let albumInfos = []
    
    for (let x = 0; x < albums.length;x++) {
      const album = await this.extrAlbum(albums[x].id).catch(e => console.log(e))
      albumInfos.push(album)
    }
    return albumInfos
  }

  async getPlaylist(url) {
    const ID = await this.getID(url);
    return this.extractPlaylist(ID);
  }

  async getID(url) {
    var token = await spotify.setup();
    spotify.setToken(token);
    var id;
    for (let i = 0; i < url.length; i++) {
      if (i > 10 && url[i] == '/') {
        for (let j = i; j < url.length; j++) {
          if (url[j] == '/') {
            id = url.slice(++j);
          }
        }
      }
    }
    return id;
  }

  async extractTrack(trackId) {
    const trackData = await spotify.extractTrack(trackId);
    trackData.id = trackId;
    return trackData;
  }

  async extractPlaylist(playlistId) {
    return await spotify.extractPlaylist(playlistId);
  }

  async extractAlbum(albumId) {
    return await spotify.extractAlbum(albumId);
  }

  }
}

module.exports = SpotifyExtractor;