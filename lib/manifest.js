'use strict';

const Hoek = require('hoek');

const internals = {};

module.exports = [
    {
        place: 'methods',
        method: 'method',
        list: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'routes',
        method: 'route',
        list: true
    },
    {
        place: 'caches',
        method: 'cache.provision',
        list: true,
        async: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'decorations',
        method: 'decorate',
        signature: ['type', 'property', 'method', 'options']
        list: true,
        useFilename: internals.camelizeOn('property')
    },
    {
        place: 'expose',
        method: 'expose',
        signature: ['key', 'value']
        list: true,
        useFilename: internals.camelizeOn('key')
    },
    {
        place: 'extensions',
        method: 'ext',
        list: true,
        useFilename: internals.camelizeOn('type')
    },
    {
        place: 'depedencies',
        method: 'dependency',
        signature: ['dependencies', 'after']
        list: false
    },
    /*
    {
        place: '',
        method: '',
        list: false,
        async: false,
        signature: [],
        useFilename: () => {}
    }
    */
];

internals.camelizeOn = (prop) => {

    return (filename, value) => {

        const base = {};
        base[prop] = internals.camelize(filename);
        return Hoek.applyToDefaults(base, value);
    }
};

internals.camelize = (name) => {

    return name.replace(/[_-]./gi, (m) => m[1].toUpperCase());
};
