'use strict';

const Path = require('path');
const Topo = require('topo');
const Hoek = require('hoek');

const internals = {};

exports.create = (amendments) => {

    const { nodes } = exports.topo(amendments);

    return nodes;
};

exports.base = () => internals.manifest();

exports.topo = (amendmentsWithDefaults = {}, dirname) => {

    const { '*': manifestDefaults, ...manifestObj } = internals.manifest();
    const { '*': amendmentDefaults, ...amendments } = amendmentsWithDefaults;

    const defaults = {
        ...manifestDefaults,
        ...(amendmentDefaults || {})
    };

    const manifest = [].concat(
            Object.entries(manifestObj),
            Object.entries(amendments)
        )
        .filter(([key, value]) => !amendments.hasOwnProperty(key) || amendments[key])   // Doesn't exist, or it does and it's truthy
        .reduce((collect, [key, value]) => ({
            ...collect,
            [key]: {
                ...(collect[key] || defaults),
                ...value
            }
        }), {});

    return Object.entries(manifest)
        .reduce((topo, [place, item]) => {

            const { before, after, ...manifestItem } = { dirname, place, ...item };

            topo.add(manifestItem, {
                group: place,
                before,
                after
            });

            return topo;
        }, new Topo());
};

internals.manifest = () => ({
    '*': {
        recurse: true,
        exclude: (path) => {

            return path.split(Path.sep).some((part) => Path.basename(part) === 'helpers');
        }
    },
    path: {
        method: 'path',
        list: false,
        example: { $literal: '__dirname' }
    },
    bind: {
        method: 'bind',
        list: false,
        after: ['services']
    },
    plugins: {
        method: 'register',
        signature: ['plugins', '[options]'],
        async: true,
        list: true,
        useFilename: (value, filename) => {

            value = Hoek.shallow(value);

            if (!value.plugins) {
                value.plugins = require(filename);
            }
            else if (!Array.isArray(value.plugins) && !value.plugins.plugin) {
                value.plugins = Hoek.shallow(value.plugins);
                value.plugins.plugin = require(filename);
            }

            return value;
        },
        example: {
            plugins: { $value: [], $comment: 'May be an array or a single plugin' },
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    dependencies: {
        method: 'dependency',
        signature: ['dependencies', '[after]'],
        list: true,
        useFilename: internals.passthruOn('dependencies'),
        after: ['bind'],
        example: {
            dependencies: [],
            after: { $value: async (server) => {}, $comment: 'Optional' }
        }
    },
    caches: {
        method: 'cache.provision',
        async: true,
        list: true,
        useFilename: internals.passthruOn('name'),
        example: {
            engine: null,
            name: ''
        }
    },
    methods: {
        method: 'method',
        list: true,
        useFilename: (value, filename) => {

            if (Array.isArray(value)) {
                return value;
            }

            return internals.camelizeOn('name')(value, filename);
        },
        after: ['bind', 'caches', 'plugins'],
        example: {
            name: '',
            method: () => null,
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    'view-manager': {   // Vision
        method: 'views',
        list: false,
        after: ['plugins', 'path']
    },
    decorations: {
        method: 'decorate',
        signature: ['type', 'property', 'method', '[options]'],
        list: true,
        useFilename: (value, filename) => {

            const parts = filename.split('.');

            if (parts.length === 1) {
                // [prop].js on { type, method, options }
                return internals.camelizeOn('property')(value, filename);
            }
            else if (parts.length === 2) {
                // [type].[prop].js on { method, options }
                const base = {};
                base.type = parts[0];
                base.property = internals.camelize(parts[1]);
                return Hoek.applyToDefaults(base, value);
            }

            return value;
        },
        example: {
            type: '',
            property: '',
            method: () => null,
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    extensions: {
        method: 'ext',
        list: true,
        useFilename: (value, filename) => {

            const applyType = internals.camelizeOn('type');

            if (Array.isArray(value)) {
                return value.map((item) => applyType(item, filename));
            }

            return applyType(value, filename);
        },
        after: ['bind', 'plugins'],
        example: {
            type: '',
            method: () => null,
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    expose: {
        method: 'expose',
        signature: ['key', 'value'],
        list: true,
        useFilename: internals.camelizeOn('key'),
        example: {
            key: '',
            value: null
        }
    },
    'auth/schemes': {
        method: 'auth.scheme',
        signature: ['name', 'scheme'],
        list: true,
        useFilename: internals.passthruOn('name'),
        after: ['bind'],
        example: {
            name: '',
            /* $lab:coverage:off$ */
            scheme: (server, options) => ({ authenticate }) // eslint-disable-line no-undef
            /* $lab:coverage:on$ */
        }
    },
    'auth/strategies': {
        method: 'auth.strategy',
        signature: ['name', 'scheme', '[options]'],
        list: true,
        useFilename: internals.passthruOn('name'),
        after: ['auth/schemes', 'plugins'],
        example: {
            name: '',
            scheme: '',
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    'auth/default': {
        method: 'auth.default',
        list: false,
        after: ['auth/strategies']
    },
    cookies: {
        method: 'state',
        signature: ['name', '[options]'],
        list: true,
        useFilename: internals.passthruOn('name'),
        example: {
            name: '',
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    models: {   // Schwifty models
        method: 'schwifty',
        list: true,
        after: ['plugins', 'path'],
        example: { $requires: ['schwifty', 'joi'], $value: internals.SchwiftyExample }
    },
    services: {   // Schmervice services
        method: 'registerService',
        list: true,
        after: ['plugins'],
        example: { $requires: ['schmervice'], $value: internals.SchmerviceExample }
    },
    routes: {
        method: 'route',
        list: true,
        useFilename: (value, filename) => {

            if (Array.isArray(value)) {
                return value;
            }

            value = Hoek.applyToDefaults({}, value);

            // Support both `config` and `options` props on route

            if (value.config) {
                value.config = Hoek.applyToDefaults({ id: filename }, value.config);
            }
            else {
                value.options = Hoek.applyToDefaults({ id: filename }, value.options || {});
            }

            return value;
        },
        after: ['plugins', 'bind', 'handler-types', 'methods', 'path'],
        example: {
            method: '',
            path: '',
            options: {
                handler: async (request, h) => {}
            }
        }
    }
});

internals.camelize = (name) => {

    return name.replace(/[_-]./g, (m) => m[1].toUpperCase());
};

internals.camelizeOn = (prop) => {

    return (value, filename) => {

        const base = {};
        base[prop] = internals.camelize(filename);
        return Hoek.applyToDefaults(base, value);
    };
};

internals.passthruOn = (prop) => {

    return (value, filename) => {

        const base = {};
        base[prop] = filename;
        return Hoek.applyToDefaults(base, value);
    };
};

/* $lab:coverage:off$ */
const Joi = null;                       // Just so the example can be written
const Schwifty = { Model: class {} };   // Ditto
internals.SchwiftyExample = class ModelName extends Schwifty.Model {

    static get tableName() {

        return '';
    }

    static get joiSchema() {

        return Joi.object({});
    }
};

const Schmervice = { Service: class {} }; // Just so the example can be written
internals.SchmerviceExample = class ServiceName extends Schmervice.Service {};
/* $lab:coverage:on$ */
