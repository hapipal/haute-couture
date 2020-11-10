'use strict';

const HauteCouture = require('../..');

module.exports = {
    name: 'my-plugin',
    async register(server, options) {

        await HauteCouture.compose(server, options);

        server.app.realm = server.realm;
    }
};
