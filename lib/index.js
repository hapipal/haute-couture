'use strict';

const Path = require('path');
const Haute = require('haute');
const Hoek = require('hoek');
const Topo = require('topo');
const ParentModule = require('parent-module');
const Manifest = require('./manifest');

const internals = {};

exports.manifest = Manifest;

exports.using = (dirname, amendments) => {

    if (dirname && typeof dirname !== 'string') {
        amendments = dirname;
        dirname = null;
    }

    dirname = dirname || Path.dirname(ParentModule());
    amendments = amendments || internals.maybeGetHcFile(dirname);

    const manifest = Manifest.topo(amendments, dirname);

    return async (server, options) => {

        const state = internals.state(server.realm);
        const root = !state.manifest;
        state.manifest = state.manifest || new Topo();
        state.manifest.merge(manifest);

        if (amendments && amendments.overrides) {
            const override = amendments.overrides.plugin || amendments.overrides;
            await override.register(server, options);
        }

        if (!root) {
            return;
        }

        const calls = Haute.calls('server', state.manifest.nodes)
            .filter((item1, index, arr) => arr.findIndex((item2) => item1.place === item2.place) === index);

        await Haute.run(calls, server, options);
    };
};

internals.maybeGetHcFile = (dirname) => {

    const path = `${dirname}/.hc.js`;

    try {
        return require(path);
    }
    catch (err) {
        // Must be an error specifically from trying to require the hc file
        Hoek.assert(err.code === 'MODULE_NOT_FOUND' && ~err.message.indexOf(path), err);
        return undefined;
    }
};

internals.state = (realm) => {

    const state = realm.plugins['haute-couture'] = realm.plugins['haute-couture'] || {};

    return state;
};
