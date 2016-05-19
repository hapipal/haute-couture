'use strict';

const Vision = require('vision');

const internals = {};

internals.plugin = (srv, options, next) => next();

internals.plugin.attributes = { name: 'test-dep' };

module.exports = [
    {
        plugins: [Vision, internals.plugin],
        options: {}
    }
];
