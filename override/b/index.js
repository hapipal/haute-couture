'use strict';

const HauteCouture = require('../..');

module.exports = {
    name: 'b',
    async register(server, options) {

        await HauteCouture.using()(server, options);
    }
};
