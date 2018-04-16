'use strict';

const HauteCouture = require('../..');

module.exports = {
    name: 'c',
    async register(server, options) {

        await HauteCouture.using()(server, options);
    }
};
