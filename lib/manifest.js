'use strict';

const Topo = require('topo');
const Hoek = require('hoek');

const internals = {};

exports.create = (amendments, includeExtras) => {

    amendments = amendments || {};

    if (Array.isArray(amendments)) {
        amendments = { add: amendments };
    }

    const add = Hoek.flatten([].concat(amendments.add || [])); // Allow nested [{}, [{}]]
    const remove = [].concat(amendments.remove || []);
    const addLookup = Hoek.mapToObject(add, 'place');
    const removeLookup = Hoek.mapToObject(remove);

    const topoList = new Topo();

    internals.manifest.forEach((manifestItem) => {

        const place = manifestItem.place;

        if (removeLookup[place] || addLookup[place]) {
            return;
        }

        internals.add(topoList, manifestItem);
    });

    add.forEach((manifestItem) => {

        internals.add(topoList, manifestItem);
    });

    return topoList.nodes.map((item) => {

        item = Hoek.shallow(item);

        if (!includeExtras) {
            delete item.before;
            delete item.after;
            delete item.example;
        }

        return item;
    });
};

// Dogwater model amendment– use to replace schwifty default
exports.dogwater = {
    place: 'models',
    method: 'dogwater',
    list: true,
    useFilename: (filename, value) => {

        if (Array.isArray(value)) {
            return value;
        }

        return internals.passthruOn('identity')(filename, value);
    },
    after: ['plugins']
};

// Loveboat amendment– use to replace default use of routes/
exports.loveboat = [
    {   // Loveboat transforms
        place: 'route-transforms',
        method: 'routeTransforms',
        list: true,
        useFilename: (filename, value) => {

            if (Array.isArray(value)) {
                return value;
            }

            return internals.passthruOn('name')(filename, value);
        },
        after: ['plugins']
    },
    {   // Loveboat routes
        place: 'routes',
        method: 'loveboat',
        list: true,
        after: ['route-transforms', 'plugins', 'bind', 'handler-types', 'methods', 'path']
    }
];

internals.add = (topoList, manifestItem) => {

    const options = { group: manifestItem.place };

    if (manifestItem.before) {
        options.before = manifestItem.before;
    }

    if (manifestItem.after) {
        options.after = manifestItem.after;
    }

    return topoList.add(manifestItem, options);
};

internals.camelize = (name) => {

    return name.replace(/[_-]./g, (m) => m[1].toUpperCase());
};

internals.camelizeOn = (prop) => {

    return (filename, value) => {

        const base = {};
        base[prop] = internals.camelize(filename);
        return Hoek.applyToDefaults(base, value);
    };
};

internals.passthruOn = (prop) => {

    return (filename, value) => {

        const base = {};
        base[prop] = filename;
        return Hoek.applyToDefaults(base, value);
    };
};

/* $lab:coverage:off$ */
const Schwifty = { Model: class {} }; // Just so the example can be written
internals.SchwiftyExample = class ModelName extends Schwifty.Model {

    static get tableName() {

        return '';
    }

    static get joiSchema() {

        return Joi.object({}); // eslint-disable-line no-undef
    }
};
/* $lab:coverage:on$ */

internals.manifest = [
    {
        place: 'path',
        method: 'path',
        list: false,
        example: { $literal: '__dirname' }
    },
    {
        place: 'bind',
        method: 'bind',
        list: false
    },
    {
        place: 'connections',
        method: 'connection',
        list: true,
        useFilename: internals.passthruOn('labels')
    },
    {
        place: 'plugins',
        method: 'register',
        signature: ['plugins', '[options]'],
        async: true,
        list: true,
        useFilename: (filename, value) => {

            value = Hoek.shallow(value);

            if (!value.plugins) {
                value.plugins = require(filename);
            }
            else if (!Array.isArray(value.plugins) && !value.plugins.register) {
                value.plugins = Hoek.shallow(value.plugins);
                value.plugins.register = require(filename);
            }

            return value;
        },
        example: {
            plugins: [],
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {
        place: 'dependencies',
        method: 'dependency',
        signature: ['dependencies', '[after]'],
        list: true,
        useFilename: internals.passthruOn('dependencies'),
        after: ['bind'],
        example: {
            dependencies: [],
            after: { $value: (server, next) => {}, $comment: 'Optional' }
        }
    },
    {
        place: 'caches',
        method: 'cache.provision',
        async: true,
        list: true,
        useFilename: internals.passthruOn('name'),
        example: {
            engine: null,
            name: ''
        }
    },
    {
        place: 'methods',
        method: 'method',
        list: true,
        useFilename: (filename, value) => {

            if (Array.isArray(value)) {
                return value;
            }

            return internals.camelizeOn('name')(filename, value);
        },
        after: ['bind', 'caches', 'plugins'],
        example: {
            name: '',
            method: () => null,
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {   // Chairo, use seneca plugins
        place: 'seneca-plugins',
        method: 'seneca.use',
        signature: ['plugin', '[options]'],
        list: true,
        useFilename: internals.passthruOn('plugin'),
        after: ['plugins']
    },
    {   // Chairo, seneca actions as server methods
        place: 'action-methods',
        method: 'action',
        signature: ['name', 'pattern', '[options]'],
        list: true,
        useFilename: internals.camelizeOn('name'),
        after: ['plugins', 'seneca-plugins'],
        example: {
            name: '',
            pattern: {},
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {   // Vision
        place: 'view-manager',
        method: 'views',
        list: false,
        after: ['plugins', 'path']
    },
    {
        place: 'decorations',
        method: 'decorate',
        signature: ['type', 'property', 'method', '[options]'],
        list: true,
        useFilename: (filename, value) => {

            const parts = filename.split('.');

            if (parts.length === 1) {
                // [prop].js on { type, method, options }
                return internals.camelizeOn('property')(filename, value);
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
    {
        place: 'handler-types',
        method: 'handler',
        signature: ['name', 'method'],
        list: true,
        useFilename: internals.camelizeOn('name'),
        after: ['methods'],
        example: {
            name: '',
            method: () => null
        }
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
        },
        after: ['bind', 'plugins'],
        example: {
            type: '',
            method: () => null,
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {
        place: 'expose',
        method: 'expose',
        signature: ['key', 'value'],
        list: true,
        useFilename: internals.camelizeOn('key'),
        example: {
            key: '',
            value: null
        }
    },
    {
        place: 'auth/schemes',
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
    {
        place: 'auth/strategies',
        method: 'auth.strategy',
        signature: ['name', 'scheme', '[mode]', '[options]'],
        list: true,
        useFilename: internals.passthruOn('name'),
        after: ['auth/schemes', 'plugins'],
        example: {
            name: '',
            scheme: '',
            mode: { $value: '', $comment: 'Optional' },
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {
        place: 'auth/default',
        method: 'auth.default',
        list: false,
        after: ['auth/strategies']
    },
    {
        place: 'cookies',
        method: 'state',
        signature: ['name', '[options]'],
        list: true,
        useFilename: internals.passthruOn('name'),
        example: {
            name: '',
            options: { $value: '', $comment: 'Optional' }
        }
    },
    {   // Schwifty models
        place: 'models',
        method: 'schwifty',
        list: true,
        after: ['plugins', 'path'],
        example: { $requires: ['schwifty', 'joi'], $value: internals.SchwiftyExample }
    },
    {
        place: 'routes',
        method: 'route',
        list: true,
        useFilename: (filename, value) => {

            if (Array.isArray(value)) {
                return value;
            }

            value = Hoek.applyToDefaults({}, value);
            value.config = Hoek.applyToDefaults({ id: filename }, value.config || {});

            return value;
        },
        after: ['plugins', 'bind', 'handler-types', 'methods', 'path'],
        example: {
            method: '',
            path: '',
            config: {
                handler: function (request, reply) {}
            }
        }
    }
];
