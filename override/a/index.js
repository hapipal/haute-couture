'use strict';

const HauteCouture = require('../..');

module.exports = {
    name: 'a',
    async register(server, options) {

        await HauteCouture.using()(server, options);
    }
};
