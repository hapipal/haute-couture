'use strict';

const HauteCouture = require('../..');

module.exports = (server, options, next) => {

    HauteCouture.using()(server, options, (err) => {

        if (err) {
            return next(err);
        }

        server.app.realm = server.realm;
        next();
    });
};

module.exports.attributes = {
    name: 'my-plugin'
};
