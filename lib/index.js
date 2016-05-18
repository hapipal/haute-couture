'use strict';

const Path = require('path');
const Haute = require('haute');
const Manifest = require('./manifest');

const internals = {};

module.exports = (dirname, manifestExtras) => {

    if (!dirname) {
        const parent = module.parent;
        dirname = parent && Path.dirname(parent.filename);
    }

    const manifest = Manifest.concat(manifestExtras || []);

    return Haute(dirname, manifest);
};
