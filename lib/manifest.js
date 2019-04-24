'use strict';

const Path = require('path');
const Topo = require('@hapi/topo');
const Hoek = require('@hapi/hoek');

const internals = {};

exports.create = (amendments, includeExtras) => {

    amendments = amendments || {};

    if (Array.isArray(amendments)) {
        amendments = { add: amendments };
    }

    let {
        recursive,
        include,
        exclude,
        add,
        remove,
        ...meta
    } = amendments;

    recursive = !!recursive;
    exclude = (include || exclude) ? exclude :
        (filename, path) => path.split(Path.sep).includes('helpers');

    add = Hoek.flatten([].concat(add || [])); // Allow nested [{}, [{}]]
    remove = [].concat(remove || []);

    const toObject = (collect, value) => ({ ...collect, [value]: true });
    const addLookup = add.map(({ place }) => place).reduce(toObject, {});
    const removeLookup = remove.reduce(toObject, {});

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

        item = Hoek.applyToDefaults({ recursive, include, exclude, meta }, item);

        if (!includeExtras) {
            delete item.before;
            delete item.after;
            delete item.example;
        }

        return item;
    });
};

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

// E.g. a/b/c.d.js -> a-b-c.d
internals.normalizePath = (p) => {

    return Path.join(
        Path.dirname(p),
        Path.basename(p, Path.extname(p))
    )
        .split(Path.sep)
        .join('-');
};

internals.camelizeOn = (prop) => {

    return (filename, value, path) => {

        const base = {};
        base[prop] = internals.camelize(internals.normalizePath(path));
        return Hoek.applyToDefaults(base, value);
    };
};

internals.passthruOn = (prop) => {

    return (filename, value, path) => {

        const base = {};
        base[prop] = internals.normalizePath(path);
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

const Schmervice = { Service: class {} }; // Just so the example can be written
internals.SchmerviceExample = class ServiceName extends Schmervice.Service {};
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
        list: false,
        after: ['services']
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
        place: 'plugins',
        method: 'register',
        signature: ['plugins', '[options]'],
        async: true,
        list: true,
        useFilename: (filename, value) => {

            value = Object.assign({}, value);

            // Adjust for scoped module, e.g. @scoped.package -> @scoped/package
            const modulePath = filename.replace(/^@.+?\./, (m) => m.slice(0, -1) + '/');

            if (!value.plugins) {
                value.plugins = require(modulePath);
            }
            else if (!Array.isArray(value.plugins) && !value.plugins.plugin) {
                value.plugins = Object.assign({}, value.plugins);
                value.plugins.plugin = require(modulePath);
            }

            return value;
        },
        after: ['caches'],
        example: {
            plugins: { $value: [], $comment: 'May be an array or a single plugin' },
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
            after: { $value: async (server) => {}, $comment: 'Optional' }
        }
    },
    {
        place: 'methods',
        method: 'method',
        list: true,
        useFilename: (filename, value, path) => {

            if (Array.isArray(value)) {
                return value;
            }

            return internals.camelizeOn('name')(filename, value, path);
        },
        after: ['bind', 'caches', 'plugins'],
        example: {
            name: '',
            method: () => null,
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
        useFilename: (filename, value, path) => {

            const parts = internals.normalizePath(path).split('.');

            if (parts.length === 1) {
                // [prop].js on { type, method, options }
                return internals.camelizeOn('property')(filename, value, path);
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
        place: 'extensions',
        method: 'ext',
        list: true,
        useFilename: (filename, value, path) => {

            const applyType = internals.camelizeOn('type');

            if (Array.isArray(value)) {
                return value.map((item) => applyType(filename, item, path));
            }

            return applyType(filename, value, path);
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
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {   // Schwifty models
        place: 'models',
        method: 'schwifty',
        list: true,
        after: ['plugins', 'path'],
        example: { $requires: ['schwifty', 'joi'], $value: internals.SchwiftyExample }
    },
    {   // Schmervice services
        place: 'services',
        method: 'registerService',
        list: true,
        after: ['plugins'],
        example: { $requires: ['schmervice'], $value: internals.SchmerviceExample }
    },
    {
        place: 'subscriptions',
        method: 'subscription',
        signature: ['path', '[options]'],
        list: true,
        after: ['plugins'],
        example: {
            path: '',
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    {
        place: 'routes',
        method: 'route',
        list: true,
        useFilename: (filename, value, path) => {

            if (Array.isArray(value)) {
                return value;
            }

            path = internals.normalizePath(path);
            value = Hoek.applyToDefaults({}, value);

            // Support both `config` and `options` props on route

            if (value.config) {
                value.config = Hoek.applyToDefaults({ id: path }, value.config);
            }
            else {
                value.options = Hoek.applyToDefaults({ id: path }, value.options || {});
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
];
