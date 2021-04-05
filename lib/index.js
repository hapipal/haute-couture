'use strict';

const Path = require('path');
const Hoek = require('@hapi/hoek');
const ParentModule = require('parent-module');
const Haute = require('haute');
const Manifest = require('./manifest');

const internals = {};

exports.getDefaultExport = Haute.getDefaultExport;

exports.default = Manifest.default;

exports.amendment = Manifest.amendment;

exports.amendments = Manifest.amendments;

exports.manifest = Manifest.manifest;

exports.compose = async (server, options, { dirname, amendments } = {}) => {

    dirname = dirname || Path.dirname(ParentModule());
    amendments = amendments || internals.maybeGetHcFile(dirname);

    const manifest = Manifest.manifest(amendments, dirname);
    const calls = Haute.calls('server', manifest);

    return await Haute.run(calls, server, options);
};

exports.composeWith = (composeOptions) => {

    return (server, options) => exports.compose(server, options, composeOptions);
};

internals.maybeGetHcFile = (dirname) => {

    const path = Path.join(dirname, '.hc');

    try {
        const resolved = require.resolve(path);
        return exports.getDefaultExport(require(resolved), resolved);
    }
    catch (err) {
        // Must be an error specifically from trying to require the passed (normalized) path
        // Note that these error messages are of the form "Cannot find module '${path}'".
        // In node v12 this is followed by a "Require stack", which is why we're testing for
        // the module path specifically wrapped in single quotes.
        Hoek.assert(err.code === 'MODULE_NOT_FOUND' && err.message.includes(`'${path}'`), err);
        return;
    }
};
