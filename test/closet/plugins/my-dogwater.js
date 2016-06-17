'use strict';

const Dogwater = require('dogwater');

module.exports = {
    plugins: {
        register: Dogwater,
        options: {
            adapters: { myAdapter: {} },
            connections: { simple: { adapter: 'myAdapter' } }
        }
    }
};
