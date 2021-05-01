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

  async getArtist(url) {
    const artistID = await this.getID(url);
    return await this.extractArtist(artistID);
  }

  async getArtistAlbums(url) {
    const artistResult = await this.getArtist(url);
    const albumsResult = await this.extractArtistAlbums(
      artistResult.id,
    );
    const albumIds = albumsResult.map(album => album.id);
    let albumInfos = [];
    for (let x = 0; x < albumIds.length; x++) {
      albumInfos.push(await this.extractAlbum(albumIds[x]));
    }
    return {
      albums: albumInfos,
      artist: artistResult,
    };
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

  async extractArtist(artistId) {
    return await spotify.extractArtist(artistId);
  }

  async extractArtistAlbums(artistId) {
    return await spotify.extractArtistAlbums(artistId);
  }
}

module.exports = SpotifyExtractor;