'use strict';

const Topo = require('topo');
const Hoek = require('hoek');

const internals = {};

exports.create = (amendments) => {

    amendments = amendments || {};

    if (Array.isArray(amendments)) {
        amendments = { add: amendments };
    }

    const add = [].concat(amendments.add || []);
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

    return topoList.nodes;
};

internals.add = (topoList, manifestItem) => {

    const options = { group: manifestItem.place };

    if (manifestItem.before) {
        options.before = manifestItem.before;
    }

    if (manifestItem.after) {
        options.after = manifestItem.after;
    }

    manifestItem = Hoek.shallow(manifestItem);
    delete manifestItem.before;
    delete manifestItem.after;

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

internals.manifest = [
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
        }
    },
    {
        place: 'dependencies',
        method: 'dependency',
        signature: ['dependencies', '[after]'],
        list: true,
        useFilename: internals.passthruOn('dependencies'),
        after: ['bind']
    },
    {
        place: 'caches',
        method: 'cache.provision',
        async: true,
        list: true,
        useFilename: internals.passthruOn('name')
    },
    {
        place: 'methods',
        method: 'method',
        signature: ['name', 'method', '[options]'],
        list: true,
        useFilename: internals.camelizeOn('name'),
        after: ['bind', 'caches', 'plugins']
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
        after: ['plugins', 'seneca-plugins']
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
        }
    },
    {
        place: 'handler-types',
        method: 'handler',
        signature: ['name', 'method'],
        list: true,
        useFilename: internals.camelizeOn('name'),
        after: ['methods']
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
        after: ['bind', 'plugins']
    },
    {
        place: 'expose',
        method: 'expose',
        signature: ['key', 'value'],
        list: true,
        useFilename: internals.camelizeOn('key')
    },
    {
        place: 'auth/schemes',
        method: 'auth.scheme',
        signature: ['name', 'scheme'],
        list: true,
        useFilename: internals.passthruOn('name'),
        after: ['bind']
    },
    {
        place: 'auth/strategies',
        method: 'auth.strategy',
        signature: ['name', 'scheme', '[mode]', '[options]'],
        list: true,
        useFilename: internals.passthruOn('name'),
        after: ['auth/schemes', 'plugins']
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
        useFilename: internals.passthruOn('name')
    },
    {   // Schwifty models
        place: 'models',
        method: 'schwifty',
        list: true,
        after: ['plugins', 'path']
    },
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
        place: 'routes-loveboat',
        method: 'loveboat',
        list: true,
        after: ['route-transforms', 'plugins', 'bind', 'handler-types', 'methods', 'path']
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
        after: ['plugins', 'bind', 'handler-types', 'methods', 'path']
    }
];
