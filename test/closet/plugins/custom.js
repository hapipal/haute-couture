'use strict';

const internals = {};

internals.plugin = {
    name: 'test-dep',
    register(srv) {

        srv.app.sawPluginOptions = srv.realm.modifiers.route.prefix;
    }
};

module.exports = {
    plugin: internals.plugin,
    routes: { prefix: '/options' }
};
