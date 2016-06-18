'use strict';

const internals = {};

internals.plugin = (srv, options, next) => {

    srv.app.sawPluginOptions = srv.realm.modifiers.route.prefix;
    next();
};

internals.plugin.attributes = { name: 'test-dep' };

module.exports = {
    plugins: [internals.plugin],
    options: { routes: { prefix: '/options' } }
};
