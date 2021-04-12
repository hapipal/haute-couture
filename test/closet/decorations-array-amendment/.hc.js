'use strict';

const HauteCouture = require('../../..');

module.exports = {
    decorations: HauteCouture.amendment('decorations', ({ useFilename }) => ({
        signature: null,
        method: (server, opts, value) => {

            [].concat(value).forEach(({ type, property, method, options }) => {

                server.decorate(type, property, method, options);
            });
        },
        useFilename: (value, ...args) => {

            return [].concat(value).map((item) => {

                return useFilename(item, ...args)
            });
        }
    }))
};
