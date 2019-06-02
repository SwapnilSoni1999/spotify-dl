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
                // console.log(data.body['access_token']);
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

};

