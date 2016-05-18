'use strict';

const Hoek = require('hoek');

const internals = {};

internals.camelize = (name) => {

    return name.replace(/[_-]./gi, (m) => m[1].toUpperCase());
};

internals.camelizeOn = (prop) => {

    return (filename, value) => {

        const base = {};
        base[prop] = internals.camelize(filename);
        return Hoek.applyToDefaults(base, value);
    };
};

module.exports = [
    {
        place: 'connections',
        method: 'connection',
        list: true
    },
    {
        place: 'plugins',
        method: 'register',
        signature: ['plugins', 'options'],
        async: true,
        list: true
    },
    {
        place: 'dependencies',
        method: 'dependency',
        signature: ['dependencies', 'after'],
        list: false
    },
    {
        place: 'caches',
        method: 'cache.provision',
        async: true,
        list: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'methods',
        method: 'method',
        list: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'decorations',
        method: 'decorate',
        signature: ['type', 'property', 'method', 'options'],
        list: true,
        useFilename: (filename, value) => {

            // TODO [type].[prop].js on { method, options }
            // TODO [prop].js on { type, method, options }
            return internals.camelizeOn('property')(filename, value);
        }
    },
    {
        place: 'handlers',
        method: 'handler',
        signature: ['name', 'method'],
        list: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'extensions',
        method: 'ext',
        list: true,
        useFilename: (filename, value) => {

            const applyType = internals.camelizeOn('type');

            if (Array.isArray(value)) {
                return value.map((item) => applyType(filename, item));
            }

            return applyType(filename, value);
        }
    },
    {
        place: 'expose',
        method: 'expose',
        signature: ['key', 'value'],
        list: true,
        useFilename: internals.camelizeOn('key')
    },
    {
        place: 'path',
        method: 'path',
        list: false
    },
    {
        place: 'bind',
        method: 'bind',
        list: false
    },
    {
        place: 'auth/default',
        method: 'auth.default',
        list: false
    },
    {
        place: 'auth/schemes',
        method: 'auth.scheme',
        signature: ['name', 'scheme'],
        list: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'auth/strategies',
        method: 'auth.strategy',
        signature: ['name', 'scheme', 'mode', 'options'],
        list: true,
        useFilename: internals.camelizeOn('name')
    },
    {
        place: 'routes',
        method: 'route',
        list: true
    },
    {
        place: 'cookies',
        method: 'state',
        signature: ['name', 'options'],
        list: true,
        useFilename: internals.camelizeOn('name')
    }
    /*
    {
        place: '',
        method: '',
        signature: [],
        async: false,
        list: false,
        useFilename: () => {}
    }
    */
];
