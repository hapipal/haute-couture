'use strict';

const Path = require('path');
const Hoek = require('@hapi/hoek');
const ParentModule = require('parent-module');
const Haute = require('haute');
const Manifest = require('./manifest');

const internals = {};

exports.default = Manifest.default;

exports.amendment = Manifest.amendment;

exports.amendments = Manifest.amendments;

exports.manifest = Manifest.manifest;

exports.compose = async (server, options, { dirname, amendments } = {}) => {

    // Protect from usage such as { name, register: HauteCouture.compose }
    dirname = dirname || Path.dirname(ParentModule());
    amendments = amendments || internals.maybeGetHcFile(dirname);

    Hoek.assert(Path.relative(Path.resolve(dirname, '..', '..', '..'), dirname) !== Path.join('@hapi', 'hapi', 'lib'), 'You may not have called HauteCouture.compose(), which is necessary to determine the correct dirname. Consider using HauteCouture.composeWith() for your purposes.');

    const manifest = Manifest.manifest(amendments, dirname);
    const calls = Haute.calls('server', manifest);

    return await Haute.run(calls, server, options);
};

exports.composeWith = ({ dirname, amendments } = {}) => {

    dirname = dirname || Path.dirname(ParentModule());

    return (server, options) => exports.compose(server, options, { dirname, amendments });
};

internals.maybeGetHcFile = (dirname) => {

    const path = Path.join(dirname, '.hc.js');

    try {
        return require(path);
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
