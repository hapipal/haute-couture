'use strict';

const Haute = require('haute');
const Path = require('path');
const ParentModule = require('parent-module');
const Manifest = require('./manifest');

const internals = {};

module.exports = (dirname, manifestExtras) => {

    dirname = dirname || Path.dirname(ParentModule());

    const manifest = Manifest.concat(manifestExtras || []);

    return Haute(dirname, manifest);
};
