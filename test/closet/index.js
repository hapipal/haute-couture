'use strict';

const HauteCouture = require('../..');

module.exports = (server, options, next) => {

    HauteCouture()(server, options, (err) => {

        if (err) {
            return next(err);
        }

        server.expose('realm', server.realm);
        next();
    });
};

module.exports.attributes = {
    name: 'my-plugin'
};
