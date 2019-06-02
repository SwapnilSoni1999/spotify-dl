'user strict';
const SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
    clientId: 'acc6302297e040aeb6e4ac1fbdfd62c3',
    clientSecret: '0e8439a1280a43aba9a5bc0a16f3f009'
});

module.exports = {
    spotifyApi,
    setup: async function() {
        return spotifyApi.clientCredentialsGrant().then(
            (data) => {
                return data.body['access_token'];
            },
            (err) => {
                console.error(
                    'Something went wrong when retrieving an access token :',
                    err.message
                );
                process.exit(-1);
            }
        );
    },
    setToken: async function(token) {
        spotifyApi.setAccessToken(token);
    },
    extractTrack: async function(trackId) {
        return spotifyApi.getTrack(trackId).then(function(data) {
            var details = {
                name: '',
                artists: []
            }
            details.name = data.body.name;
            data.body.artists.forEach(artist => {
                details.artists.push(artist.name);
            });
            return details;
        });
    },
    extractPlaylist: async function (playlistId) {
        // I have no idea why limit is not working
        return spotifyApi.getPlaylist(playlistId, { pageSize: 200, limit: 200 }).then(function (data) {
            var details = {
                name: '',
                total_tracks: 0,
                tracks: []
            }
            details.name = data.body.name + ' - ' + data.body.owner.display_name;
            details.total_tracks = data.body.tracks.total;
            data.body.tracks.items.forEach(item => {
                details.tracks.push(item.track.id);
            });
            return details;
        });
    }

};

