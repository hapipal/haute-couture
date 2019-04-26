'use strict';

const Path = require('path');
const Haute = require('haute');
const Hoek = require('@hapi/hoek');
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

    const manifest = Manifest.create(manifestAmendments).map((item) => ({
        ...item,
        useFilename: item.useFilename && ((value, filename, path) => item.useFilename(filename, value, path)),
        dirname
    }));

    return async (server, ...options) => {

        const calls = Haute.calls('server', manifest);

        return await Haute.run(calls, server, ...options);
    };
};

internals.maybeGetHcFile = (dirname) => {

    const path = `${dirname}/.hc.js`;

    try {
        return require(path);
    }
    catch (err) {
        // Must be an error specifically from trying to require the passed (normalized) path
        // Note that these error messages are of the form "Cannot find module '${path}'".
        // In node v12 this is followed by a "Require stack", which is why we're testing for
        // the module path specifically wrapped in single quotes.
        Hoek.assert(err.code === 'MODULE_NOT_FOUND' && ~err.message.indexOf(`'${path}'`), err);
        return undefined;
    }
};
