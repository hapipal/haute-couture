'use strict';

const Chairo = require('chairo');
const Dogwater = require('dogwater');
const Loveboat = require('loveboat');
const Vision = require('vision');

const internals = {};

internals.plugin = (srv, options, next) => {

    srv.app.sawPluginOptions = srv.realm.modifiers.route.prefix;
    next();
};

internals.plugin.attributes = { name: 'test-dep' };

module.exports = [
    {
        plugins: [{
            register: Dogwater,
            options: {
                adapters: { myAdapter: {} },
                connections: { simple: { adapter: 'myAdapter' } }
            }
        }]
    },
    {
        plugins: [{
            register: Chairo,
            options: { web: false }
        }]
    },
    {
        plugins: [Vision, Loveboat]
    },
    {
        plugins: [internals.plugin],
        options: { routes: { prefix: '/options' } }
    }
];
