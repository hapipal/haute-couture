'use strict';

const Path = require('path');
const Topo = require('@hapi/topo');
const Hoek = require('@hapi/hoek');

const internals = {};

exports.default = Symbol('default');

exports.amendment = (place, opts) => {

    Hoek.assert(internals.amendments[place], `There is no default amendment at "${place}".`);

    return { ...internals.amendments[place], ...opts };
};

exports.amendments = (overrides) => {

    overrides = { ...overrides };

    const defaultKey = exports.default in overrides ? exports.default : '$default';
    const defaults = { ...overrides[defaultKey] };
    delete overrides[defaultKey];

    const amendments = {};

    // Shallow clone for modification

    Object.entries(internals.amendments).forEach(([place, amendment]) => {
        // Iterate and assign in an effort to preserve key ordering
        amendments[place] = amendment;
    });

    // Apply overrides

    Object.entries(overrides).forEach(([place, amendment]) => {

        if (amendment) {
            amendments[place] = amendment;
        }
        else {
            delete amendments[place];
        }
    });

    // Apply defaults

    Object.entries(amendments).forEach(([place, amendment]) => {

        amendments[place] = Hoek.applyToDefaults(defaults, amendment);

        const { include, exclude } = amendments[place];

        amendments[place].exclude = (include || exclude) ? exclude :
            (_, path) => path.split(Path.sep).includes('helpers');
    });

    return amendments;
};

exports.manifest = (overrides, dirname) => {

    const amendments = exports.amendments(overrides);
    const topo = new Topo.Sorter();

    Object.entries(amendments).forEach(([place, amendment]) => {

        const item = { ...amendment, place };

        if (dirname) {
            item.dirname = dirname;
        }

        delete item.before;
        delete item.after;
        delete item.example;

        topo.add(item, {
            group: place,
            before: amendment.before,
            after: amendment.after
        });
    });

    return topo.nodes;
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

    return (value, _, path) => {

        const base = {
            [prop]: internals.camelize(internals.normalizePath(path))
        };

        return Hoek.applyToDefaults(base, value);
    };
};

internals.passthruOn = (prop) => {

    return (value, _, path) => {

        const base = {
            [prop]: internals.normalizePath(path)
        };

        return Hoek.applyToDefaults(base, value);
    };
};

/* $lab:coverage:off$ */
const Schwifty = { Model: class {} }; // Just so the example can be written
const Joi = { object: () => null };
internals.SchwiftyExample = class ModelName extends Schwifty.Model {
    static tableName = '';
    static joiSchema = Joi.object({});
};

const Schmervice = { Service: class {} }; // Just so the example can be written
internals.SchmerviceExample = class ServiceName extends Schmervice.Service {};
/* $lab:coverage:on$ */

internals.amendments = {
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
    caches: {
        method: 'cache.provision',
        list: true,
        useFilename: internals.passthruOn('name'),
        example: {
            engine: null,
            name: ''
        }
    },
    plugins: {
        method: 'register',
        list: true,
        useFilename: (value, filename) => {

            if (!Array.isArray(value) && !value.register && !value.plugin) {
                // Adjust for scoped module, e.g. @scoped.package -> @scoped/package
                const modulePath = filename.replace(/^@.+?\./, (m) => m.slice(0, -1) + '/');
                value = Hoek.clone(value, { shallow: true });
                value.plugin = require(modulePath);
            }

            return value;
        },
        after: ['caches'],
        example: {
            plugin: { $literal: `require('some-plugin')`, $comment: 'Optional, if removed will be inferred from filename' },
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
    methods: {
        method: 'method',
        list: true,
        useFilename: (value, filename, path) => {

            if (Array.isArray(value)) {
                return value;
            }

            return internals.camelizeOn('name')(value, filename, path);
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
        useFilename: (value, filename, path) => {

            const parts = internals.normalizePath(path).split('.');

            if (parts.length === 1) {
                // [prop].js on { type, method, options }
                return internals.camelizeOn('property')(value, filename, path);
            }
            else if (parts.length === 2) {
                // [type].[prop].js on { method, options }
                const base = {
                    type: parts[0],
                    property: internals.camelize(parts[1])
                };
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
        useFilename: (value, filename, path) => {

            const applyType = internals.camelizeOn('type');

            if (Array.isArray(value)) {
                return value.map((item) => applyType(item, filename, path));
            }

            return applyType(value, filename, path);
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
        method: 'registerModel',
        list: true,
        after: ['plugins', 'path'],
        example: { $requires: ['@hapipal/schwifty', 'joi'], $value: internals.SchwiftyExample }
    },
    services: {   // Schmervice services
        method: 'registerService',
        list: true,
        after: ['plugins'],
        example: { $requires: ['@hapipal/schmervice'], $value: internals.SchmerviceExample }
    },
    subscriptions: {
        method: 'subscription',
        signature: ['path', '[options]'],
        list: true,
        after: ['plugins'],
        example: {
            path: '',
            options: { $value: {}, $comment: 'Optional' }
        }
    },
    validator: {
        method: 'validator',
        list: false,
        example: { $requires: ['joi'], $literal: 'Joi' }
    },
    routes: {
        method: 'route',
        list: true,
        useFilename: (value, _, path) => {

            if (Array.isArray(value)) {
                return value;
            }

            path = internals.normalizePath(path);
            value = Hoek.clone(value, { shallow: true });

            // Support both `config` and `options` props on route

            if (value.config) {
                value.config = Hoek.applyToDefaults({ id: path }, value.config);
            }
            else {
                value.options = Hoek.applyToDefaults({ id: path }, value.options || {});
            }

            return value;
        },
        after: ['plugins', 'bind', 'handler-types', 'methods', 'path', 'validator'],
        example: {
            method: '',
            path: '',
            options: {
                handler: async (request, h) => {}
            }
        }
    }
};
