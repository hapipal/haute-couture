'use strict';

const Path = require('path');
const Url = require('url');
const Hoek = require('@hapi/hoek');
const ParentModule = require('parent-module');
const Mo = require('mo-walk');
const Haute = require('haute');
const Manifest = require('./manifest');

const internals = {};

exports.getDefaultExport = Haute.getDefaultExport;

exports.default = Manifest.default;

exports.amendment = Manifest.amendment;

exports.amendments = Manifest.amendments;

exports.manifest = Manifest.manifest;

exports.compose = async (server, options, { dirname, amendments } = {}) => {

    dirname = dirname || Path.dirname(internals.normalizeToPath(ParentModule()));
    amendments = amendments || await internals.maybeGetHcFile(dirname);

    // Protect from usage such as { name, register: HauteCouture.compose }
    Hoek.assert(Path.relative(Path.resolve(dirname, '..', '..', '..'), dirname) !== Path.join('@hapi', 'hapi', 'lib'), 'You may not have called HauteCouture.compose(), which is necessary to determine the correct dirname. Consider using HauteCouture.composeWith() for your purposes.');

    const manifest = Manifest.manifest(amendments, dirname);
    const calls = await Haute.calls('server', manifest);

    return await Haute.run(calls, server, options);
};

exports.composeWith = ({ dirname, amendments } = {}) => {

    dirname = dirname || Path.dirname(internals.normalizeToPath(ParentModule()));

    return (server, options) => exports.compose(server, options, { dirname, amendments });
};

internals.maybeGetHcFile = async (dirname) => {

    const resolved = await Mo.tryToResolve(Path.join(dirname, '.hc'));

    if (resolved) {
        return exports.getDefaultExport(...resolved);
    }
};

internals.normalizeToPath = (path) => {

    return path.startsWith('file:/') ? Url.fileURLToPath(path) : path;
};
