'use strict';

const Path = require('path');
const Haute = require('haute');
const Hoek = require('hoek');
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

    const manifest = Manifest.create(manifestAmendments);

    return Haute.using(dirname, 'server', manifest);
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
