'use strict';

const Path = require('path');
const Haute = require('haute');

const internals = {};

module.exports = (dirname, manifestExtras) => {

    if (!dirname) {
        const parent = module.parent;
        dirname = parent && Path.dirname(parent.filename);
    }

    const manifest = internals.manifest.concat(manifestExtras || []);

    return Haute(dirname, manifest);
};

internals.manifest = [
    {
        place: 'methods',
        method: 'method',
        list: true,
        async: false,
        useFilename: (filename, value) => {

            const name = internals.camelize(filename);
            return Hoek.applyToDefaults({ name }, value);
        }
    }
];

internals.camelize = (name) => {

    return name.replace(/[_-]./gi, (m) => m[1].toUpperCase());
};
