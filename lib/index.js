'use strict';

const Path = require('path');
const Haute = require('haute');
const Hoek = require('hoek');
const Topo = require('topo');
const ParentModule = require('parent-module');
const Manifest = require('./manifest');

const internals = {};

exports.manifest = Manifest;

exports.using = (dirname, manifestAmendments) => {

    if (dirname && typeof dirname !== 'string') {
        manifestAmendments = dirname;
        dirname = null;
    }

    dirname = dirname || Path.dirname(ParentModule());
    manifestAmendments = manifestAmendments || internals.maybeGetHcFile(dirname);

    const manifest = Manifest.create(manifestAmendments, dirname);

    return async (server, options) => {

        const state = internals.state(server.realm);
        const root = !state.manifest;
        state.manifest = state.manifest || new Topo();
        state.manifest.merge(manifest);

        if (manifestAmendments && manifestAmendments.overrides) {
            const override = manifestAmendments.overrides.plugin || manifestAmendments.overrides;
            await override.register(server, options);
        }

        if (!root) {
            return;
        }

        const haute = Haute.using('server', state.manifest.nodes);
        const calls = haute.calls()
            .filter((item1, index, arr) => arr.findIndex((item2) => item1.place === item2.place) === index);

        await haute.run(calls, server, options);
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
