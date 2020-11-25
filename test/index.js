'use strict';

// Load modules

const Path = require('path');
const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const Renamer = require('renamer');
const Glob = require('glob');
const Joi = require('joi');
const Hapi = require('@hapi/hapi');
const Nes = require('@hapi/nes');
const { Team } = require('@hapi/teamwork');
const Closet = require('./closet');
const HauteCouture = require('..');

// Test shortcuts

const { before, describe, it } = exports.lab = Lab.script();
const { expect } = Code;

describe('HauteCouture', () => {

    const invalidateCache = () => {

        Object.keys(require.cache).forEach((key) => {

            if (key.startsWith(__dirname)) {
                delete require.cache[key];
            }
        });

        // It's dirty, but without this requiring a missing module that was
        // previously available will error with ENOENT rather than MODULE_NOT_FOUND,
        // which isn't what haute would expect.

        Object.keys(module.constructor._pathCache).forEach((key) => {

            if (key.startsWith(__dirname)) {
                delete module.constructor._pathCache[key];
            }
        });
    };

    const makeAbsolute = (file) => `${__dirname}/closet/${file}`;

    const allFiles = () => {

        return Glob.sync(`${__dirname}/closet/**`)
            .map((file) => file.replace(`${__dirname}/closet`, ''))
            .map((file) => file.replace(/^\//, ''))
            .filter((file) => !['', 'index.js'].includes(file));
    };

    const renamer = new Renamer();

    const rename = (opts) => {

        return renamer.rename({
            ...opts,
            // Specifying specific default plugins works around a change in
            // require.resolve()'s path option (see nodejs/node#23683) as it is
            // used internally to the renamer module.
            plugin: [
                require.resolve('renamer/lib/plugin/index'),
                require.resolve('renamer/lib/plugin/default')
            ]
        });
    };

    const using = (files) => {

        const offFiles = allFiles().filter((file) => files.indexOf(file) === -1);

        rename({
            files: offFiles.map(makeAbsolute),
            find: /$/,
            replace: '.off'
        });

        invalidateCache();
    };

    const notUsing = (files) => {

        rename({
            files: files.map(makeAbsolute),
            find: /$/,
            replace: '.off'
        });

        invalidateCache();
    };

    const reset = () => {

        rename({
            files: allFiles().map(makeAbsolute),
            find: /\.off$/,
            replace: ''
        });
    };

    const bigServer = Hapi.server();

    before({ timeout: 4000 }, async () => {

        reset();

        notUsing([
            'decorations/server.bad.test-dec.js',
            'methods/bad-arr-method.js',
            'validator.js',
            'routes/validator-route.js'
        ]);

        await bigServer.register(Closet);

        reset();

        await bigServer.initialize();
    });

    it('defaults to look in the caller\'s directory.', () => {

        // Just an example to show it used the caller's directory
        expect(bigServer.registrations['@hapi/vision']).to.exist();
    });

    it('can look in specific directory.', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'my-specific-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet/specific`
            })
        };

        await server.register(plugin);

        // Just an example to show it used the caller's directory
        expect(server.registrations['specific-sub-plugin']).to.exist();
    });

    it('allows one to amend the haute manifest.', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'my-specific-plugin',
            register: HauteCouture.composeWith({
                amendments: { plugins: false },
                dirname: `${__dirname}/closet/specific`
            })
        };

        await server.register(plugin);

        // From the prev test we can see this would have existed were the manifest not altered
        expect(server.registrations['specific-sub-plugin']).to.not.exist();
    });

    it('allows one to amend the haute manifest, omitting dirname.', async () => {

        const server = Hapi.server();

        // Remove all instructions

        const plugin = {
            name: 'my-specific-plugin',
            register: HauteCouture.composeWith({
                amendments: HauteCouture.manifest().reduce((collect, { place }) => ({
                    ...collect,
                    [place]: false
                }), {})
            })
        };

        await server.register(plugin);

        // See prev tests– without amendments vision would have been registered
        expect(server.registrations.vision).to.not.exist();
    });


    it('accepts additional haute manifest items in an array.', async (flags) => {

        flags.onCleanup = reset;

        const server = Hapi.server();

        const called = {};
        server.decorate('server', 'special', function (myArg) {

            called.myArg = myArg;
            called.length = arguments.length;
        });

        const plugin = {
            name: 'my-special-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet`,
                amendments: {
                    special: {
                        method: 'special',
                        signature: ['myArg'],
                        list: false
                    }
                }
            })
        };

        using(['special.js']);

        await server.register(plugin);

        expect(called.myArg).to.equal('mySpecialValue');
        expect(called.length).to.equal(1);
    });

    it('registers plugins in plugins/.', () => {

        expect(bigServer.registrations).to.include([
            // { plugin: { plugin: { register } }}
            '@hapipal/schmervice',
            // No plugin specified, scoped module
            '@hapipal/schwifty',
            // No plugin specified, unscoped module
            'hapi-api-version',
            // Capture sawPluginOptions
            'test-dep',
            // { name, register }
            'test-dep-register',
            // Array of plugins
            'test-dep-array1',
            'test-dep-array2'
        ]);

        expect(bigServer.app.sawPluginOptions).to.equal('/options');
    });

    it('enforces dependencies in dependencies/.', () => {

        expect(bigServer.app.deps).have.length(2);
        expect(bigServer.app.deps).to.only.contain(['@hapi/vision', 'test-dep']);
    });

    it('provisions caches in caches/.', () => {

        expect(() => {

            bigServer.cache({ cache: 'my-named-cache', segment: 'seg' });
            bigServer.cache({ cache: 'test-cache', segment: 'seg' });
        }).to.not.throw();
    });

    it('registers server methods in methods/, respecting bound context.', () => {

        const resultOne = bigServer.methods.myNamedMethod();
        expect(resultOne).to.equal('my-named-method');

        const resultTwo = bigServer.methods.testMethod();
        expect(resultTwo).to.equal('test-method');

        const resultThree = bigServer.methods.bindMethod();
        expect(resultThree).to.equal({ someContext: true });

        const resultFour = bigServer.methods.arrMethodOne();
        expect(resultFour).to.equal('arr-method-one');

        const resultFive = bigServer.methods.arrMethodTwo();
        expect(resultFive).to.equal('arr-method-two');
    });

    it('does not apply filename to methods in array.', async (flags) => {

        flags.onCleanup = reset;

        const server = Hapi.server();

        using([
            'methods',
            'methods/bad-arr-method.js'
        ]);

        const err = await expect(server.register(Closet)).to.reject();
        expect(err.message).to.match(/server\.method\(\)/);
        expect(err.message).to.match(/\"name\" is required/);
    });

    it('registers view manager in view-manager.js.', () => {

        expect(bigServer.app.realm.plugins.vision.manager).to.exist();
    });

    it('registers decorations in decorations/.', () => {

        expect(bigServer.myNamedDec()).to.equal('server.myNamedDec()');
        expect(bigServer.testDec()).to.equal('server.testDec()');
        expect(bigServer.anotherTestDec()).to.equal('server.anotherTestDec()');
    });

    it('registers extensions in extensions/.', async () => {

        bigServer.route({
            method: 'get',
            path: '/extensions',
            handler: (request) => null
        });

        const res = await bigServer.inject({
            method: 'get',
            url: '/extensions'
        });

        expect(res.request.app.lifecycle).to.equal([
            'onPreAuth', 'onPostAuth',
            'onPreHandler', 'onPostHandler'
        ]);
    });

    it('registers extensions deeply with inferred ext type.', async (flags) => {

        flags.onCleanup = reset;

        const server = Hapi.server();

        notUsing(['extensions-deep/extensions/x/not-an-ext.js']);

        await HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/extensions-deep` });

        expect(server.app).to.equal({});

        await server.initialize();

        expect(server.app).to.only.contain([
            'x/on-pre-start',
            'x/on-pre-start.y',
            'x/on-pre-start/y',
            'x/has-configured-ext'
        ]);
    });

    it('only accepts proper extension types from deep extension file paths.', async (flags) => {

        flags.onCleanup = reset;

        const server = Hapi.server();

        using([
            'extensions-deep',
            'extensions-deep/extensions',
            'extensions-deep/extensions/x',
            'extensions-deep/extensions/x/not-an-ext.js'
        ]);

        await expect(HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/extensions-deep` }))
            .to.reject(/"type" must be a string/);
    });

    it('exposes key-value pairs in expose/.', () => {

        const plugin = bigServer.plugins['my-plugin'];
        expect(plugin.myNamedExpose).to.equal('my-named-expose');
        expect(plugin.testExpose).to.equal('test-expose');
    });

    it('sets bind context in bind.js.', () => {

        expect(bigServer.app.realm.settings.bind).to.equal({ someContext: true });
    });

    it('sets server path prefix in path.js.', () => {

        expect(bigServer.app.realm.settings.files.relativeTo).to.equal(`${__dirname}/closet`);
    });

    it('defines auth schemes in auth/schemes/ and strategies in auth/strategies/.', async () => {

        bigServer.route({
            method: 'get',
            path: '/my-named-strategy',
            handler: (request) => null,
            config: { auth: 'my-named-strategy' }
        });

        bigServer.route({
            method: 'get',
            path: '/test-strategy',
            handler: (request) => null,
            config: { auth: 'test-strategy' }
        });

        const resOne = await bigServer.inject({
            method: 'get',
            url: '/my-named-strategy'
        });

        expect(resOne.request.auth.credentials).to.equal({
            myNamedScheme: {
                myNamedStrategy: true
            }
        });

        const resTwo = await bigServer.inject({
            method: 'get',
            url: '/test-strategy'
        });

        expect(resTwo.request.auth.credentials).to.equal({
            testScheme: {
                testStrategy: true
            }
        });
    });

    it('defines default auth strategy in auth/default.js.', () => {

        expect(bigServer.auth.settings.default.strategies).to.equal(['my-named-strategy']);
    });

    it('defines cookies in cookies/.', () => {

        expect(bigServer.states.cookies['my-named-cookie']).to.exist();
        expect(bigServer.states.cookies['test-cookie']).to.exist();
        expect(bigServer.states.cookies['test-cookie'].ttl).to.equal(666);
    });

    it('defines schwifty models in models/.', () => {

        const models = bigServer.models(true);
        expect(models).to.have.length(1);
        expect(models.MyNamedModel).to.exist();
    });

    it('defines schmervice services in services/.', () => {

        const services = bigServer.services();
        expect(services).to.have.length(1);
        expect(services.myService).to.exist();
    });

    it('defines routes in routes/.', () => {

        expect(bigServer.lookup('my-id-route')).to.exist();
        expect(bigServer.lookup('id-config-route')).to.exist();
        expect(bigServer.lookup('test-route')).to.exist();
        expect(bigServer.lookup('arr-routes')).to.not.exist();
        expect(bigServer.match('get', '/arr-route-one')).to.exist();
        expect(bigServer.match('get', '/arr-route-two')).to.exist();
    });

    it('defines subscriptions in subscriptions/.', async (flags) => {

        await bigServer.start();
        const client = new Nes.Client(`ws://localhost:${bigServer.info.port}`);

        flags.onCleanup = async () => {

            client.disconnect();
            await bigServer.stop();
        };

        const team = new Team();

        await client.connect();
        await client.subscribe('/subscription-test', (data) => {

            expect(data).to.equal({ id: 1, message: 'test' });
            team.attend();
        });

        await bigServer.publish('/subscription-test', { id: 1, message: 'test' });

        await team.work;
    });

    it('sets a validator in validator.js', async (flags) => {

        flags.onCleanup = reset;

        const plugin = {
            name: 'my-validator-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet`
            })
        };

        // Without validator, registering this route should fail

        using(['routes', 'routes/validator-route.js']);

        await expect(Hapi.server().register(plugin)).to.reject(/Cannot set uncompiled validation rules without configuring a validator/);

        reset();

        // Prove validator exists by observing that route registration now succeeds

        using(['validator.js', 'routes', 'routes/validator-route.js']);

        await expect(Hapi.server().register(plugin)).to.not.reject();
    });

    it('does not apply filename to decorations with more than two parts.', async (flags) => {

        flags.onCleanup = reset;

        const server = Hapi.server();

        using([
            'decorations',
            'decorations/server.bad.test-dec.js'
        ]);

        await expect(server.register(Closet)).to.reject(/Missing decoration property name/);
    });

    it('registers decorations deeply with inferred property name and type.', async (flags) => {

        flags.onCleanup = reset;

        notUsing([
            'decorations-deep/decorations/x/not-a-type.t.js',
            'decorations-deep/decorations/x/not-a-type/v.js'
        ]);

        const server = Hapi.server();

        await HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/decorations-deep` });

        expect(server.decorations).to.equal({
            handler: [],
            toolkit: [],
            request: [
                'serverY',                  // server/request.y
                'bySelfHasConfiguredFull',  // x/server/has-configured-full ({ type, property })
                'xServerHasConfiguredType'  // x/server/has-configured-type ({ type })
            ],
            response: [
                'xW'                        // x/response.w
            ],
            server: [
                'xU',                       // server/x/u
                'x',                        // server/x
                'xZ'                        // x/server/z
            ]
        });
    });

    it('only accepts proper decoration types from deep file paths.', async (flags) => {

        flags.onCleanup = reset;

        const server = Hapi.server();

        using([
            'decorations-deep',
            'decorations-deep/decorations',
            'decorations-deep/decorations/x',
            'decorations-deep/decorations/x/not-a-type',
            'decorations-deep/decorations/x/not-a-type/v.js'
        ]);

        await expect(HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/decorations-deep` }))
            .to.reject(/Unknown decoration type: null/);

        reset();

        using([
            'decorations-deep',
            'decorations-deep/decorations',
            'decorations-deep/decorations/x',
            'decorations-deep/decorations/x/not-a-type.t.js'
        ]);

        await expect(HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/decorations-deep` }))
            .to.reject(/Unknown decoration type: null/);
    });

    it('rejects when something bad happens.', async () => {

        const server = Hapi.server();

        await expect(HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/bad-plugin` })).to.reject(/Ya blew it!/);
    });

    it('recurses by default.', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'my-recursive-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet/recursive`
            })
        };

        await server.register(plugin);

        expect(server.table().map((r) => r.settings.id)).to.equal([
            'item-one',
            'two-item-one',
            'one-a-item-one',
            'one-a-item-two',
            'one-b-item-one',
            'two-a-item-one'
        ]);
    });

    it('recurses, skipping helpers by default.', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'my-recursive-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet/recursive`,
                amendments: {
                    $default: {
                        recursive: true
                    }
                }
            })
        };

        await server.register(plugin);

        expect(server.table().map((r) => r.settings.id)).to.equal([
            'item-one',
            'two-item-one',
            'one-a-item-one',
            'one-a-item-two',
            'one-b-item-one',
            'two-a-item-one'
        ]);
    });

    it('recurses with exclusion.', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'my-recursive-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet/recursive`,
                amendments: {
                    $default: {
                        recursive: true,
                        exclude: (filename, path) => {

                            return path.split(Path.sep).includes('a') ||
                                path.split(Path.sep).includes('helpers');
                        }
                    }
                }
            })
        };

        await server.register(plugin);

        expect(server.table().map((r) => r.settings.id)).to.equal([
            'item-one',
            'two-item-one',
            'one-b-item-one'
        ]);
    });

    it('recurses with inclusion.', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'my-recursive-plugin',
            register: HauteCouture.composeWith({
                dirname: `${__dirname}/closet/recursive`,
                amendments: {
                    $default: {
                        recursive: true,
                        include: (filename, path) => {

                            return path.split(Path.sep).includes('one');
                        }
                    }
                }
            })
        };

        await server.register(plugin);

        expect(server.table().map((r) => r.settings.id)).to.equal([
            'one-a-item-one',
            'one-a-item-two',
            'one-b-item-one'
        ]);
    });

    describe('amendment()', () => {

        it('fetches default amendment by place.', () => {

            expect(HauteCouture.amendment('subscriptions')).to.equal({
                method: 'subscription',
                signature: ['path', '[options]'],
                list: true,
                after: ['plugins'],
                example: {
                    path: '',
                    options: { $value: {}, $comment: 'Optional' }
                }
            });
        });

        it('fetches default amendment with modification.', () => {

            const opts = {
                recurse: false,
                meta: { info: true }
            };

            expect(HauteCouture.amendment('subscriptions', opts)).to.equal({
                method: 'subscription',
                signature: ['path', '[options]'],
                list: true,
                after: ['plugins'],
                example: {
                    path: '',
                    options: { $value: {}, $comment: 'Optional' }
                },
                recurse: false,
                meta: { info: true }
            });
        });

        it('throws when no such amendment exists.', () => {

            expect(() => HauteCouture.amendment('nope')).to.throw('There is no default amendment at "nope".');
        });

        it('can extend defaults by passing options as a function.', () => {

            const opts = ({ list }) => ({
                list: !list,
                example: {
                    $comment: 'Use with nes',
                    path: '',
                    options: {}
                }
            });

            expect(HauteCouture.amendment('subscriptions', opts)).to.equal({
                method: 'subscription',
                signature: ['path', '[options]'],
                list: false,
                after: ['plugins'],
                example: {
                    $comment: 'Use with nes',
                    path: '',
                    options: {}
                }
            });
        });

        it('can extend defaults by passing options as a function (integration).', async (flags) => {

            flags.onCleanup = reset;

            const server = Hapi.server();

            await HauteCouture.compose(server, {}, { dirname: `${__dirname}/closet/decorations-array-amendment` });

            expect(server.decorations).to.equal({
                handler: [],
                response: [],
                request: ['marketplace'],
                server: ['marketplace'],
                toolkit: ['marketplace']
            });
        });
    });

    describe('amendments()', () => {

        it('returns the default amendments.', () => {

            const amendments = HauteCouture.amendments();

            expect(Object.values(amendments).some((item) => item.example)).to.equal(true);
            expect(Object.values(amendments).some((item) => item.after)).to.equal(true);

            Joi.assert(amendments, Joi.object().pattern(Joi.any(), {
                place: Joi.string().regex(/[\w\.]+/),
                method: Joi.string().regex(/[\w\.]+/),
                signature: Joi.array().items(Joi.string().regex(/^\[?\w+\]?$/)),
                list: Joi.boolean(),
                useFilename: Joi.func(),
                recursive: Joi.boolean(),
                exclude: Joi.func(),
                include: Joi.func(),
                before: Joi.array().items(Joi.string()).single(),
                after: Joi.array().items(Joi.string()).single(),
                example: Joi.any(),
                meta: Joi.object()
            }));

            const summarize = ([place, item]) => `${item.method}() at ${place}`;
            const summary = Object.entries(amendments).map(summarize);

            expect(summary.sort()).to.equal([
                'auth.default() at auth/default',
                'auth.scheme() at auth/schemes',
                'auth.strategy() at auth/strategies',
                'bind() at bind',
                'cache.provision() at caches',
                'decorate() at decorations',
                'dependency() at dependencies',
                'expose() at expose',
                'ext() at extensions',
                'method() at methods',
                'path() at path',
                'register() at plugins',
                'registerModel() at models',
                'registerService() at services',
                'route() at routes',
                'state() at cookies',
                'subscription() at subscriptions',
                'validator() at validator',
                'views() at view-manager'
            ]);
        });

        it('returns the default amendments with additions, removals, and replacements.', () => {

            const amendments = HauteCouture.amendments({
                'funky-bind': {
                    method: 'funkyBind'
                },
                path: false,
                routes: {
                    ...HauteCouture.amendment('routes'),
                    method: 'funkyRoute'
                }
            });

            const summarize = ([place, item]) => `${item.method}() at ${place}`;
            const summary = Object.entries(amendments).map(summarize);

            expect(summary.sort()).to.equal([
                'auth.default() at auth/default',
                'auth.scheme() at auth/schemes',
                'auth.strategy() at auth/strategies',
                'bind() at bind',
                'cache.provision() at caches',
                'decorate() at decorations',
                'dependency() at dependencies',
                'expose() at expose',
                'ext() at extensions',
                'funkyBind() at funky-bind',
                'funkyRoute() at routes',
                'method() at methods',
                'register() at plugins',
                'registerModel() at models',
                'registerService() at services',
                'state() at cookies',
                'subscription() at subscriptions',
                'validator() at validator',
                'views() at view-manager'
            ]);
        });
    });

    describe('manifest()', () => {

        const ignoreFields = ({ include, exclude, ...item }) => item;

        it('returns the default haute manifest.', () => {

            const manifest = HauteCouture.manifest();
            Joi.assert(manifest, Joi.array().items({
                place: Joi.string().regex(/[\w\.]+/),
                method: Joi.string().regex(/[\w\.]+/),
                signature: Joi.array().items(Joi.string().regex(/^\[?\w+\]?$/)),
                list: Joi.boolean(),
                useFilename: Joi.func(),
                recursive: Joi.boolean(),
                exclude: Joi.func(),
                include: Joi.func(),
                meta: Joi.object()
            }));

            const summarize = (item) => `${item.method}() at ${item.place}`;
            const summary = manifest.map(summarize);

            expect(summary).to.equal([
                'path() at path',
                'cache.provision() at caches',
                'register() at plugins',
                'views() at view-manager',
                'decorate() at decorations',
                'expose() at expose',
                'state() at cookies',
                'registerModel() at models',
                'registerService() at services',
                'bind() at bind',
                'dependency() at dependencies',
                'method() at methods',
                'ext() at extensions',
                'auth.scheme() at auth/schemes',
                'auth.strategy() at auth/strategies',
                'auth.default() at auth/default',
                'subscription() at subscriptions',
                'validator() at validator',
                'route() at routes'
            ]);
        });

        it('removes items from the manifest by place.', () => {

            const defaultManifest = HauteCouture.manifest().map(ignoreFields);
            const manifest = HauteCouture.manifest({
                // Bottom two
                validator: false,
                routes: false
            })
                .map(ignoreFields);

            expect(manifest.length).to.equal(defaultManifest.length - 2);

            manifest.forEach((item, i) => {

                expect(item).to.equal(defaultManifest[i]);
            });
        });

        it('replaces items in the manifest by place.', () => {

            const defaultManifest = HauteCouture.manifest().map(ignoreFields);
            const manifest = HauteCouture.manifest({
                routes: {
                    method: 'myRoute'
                },
                models: {
                    method: 'mySchwifty'
                }
            })
                .map(ignoreFields);

            const allOthers = (item) => item.place !== 'routes' && item.place !== 'models';
            expect(manifest.filter(allOthers)).to.equal(defaultManifest.filter(allOthers));

            const routeItem = manifest.find((item) => item.place === 'routes');
            expect(routeItem).to.equal({
                place: 'routes',
                method: 'myRoute'
            });

            const schwiftyItem = manifest.find((item) => item.place === 'models');
            expect(schwiftyItem).to.equal({
                place: 'models',
                method: 'mySchwifty'
            });
        });

        it('adds new items to the manifest.', () => {

            const defaultManifest = HauteCouture.manifest().map(ignoreFields);
            const manifest = HauteCouture.manifest({
                'funky-routes': {
                    method: 'funkyRoutes',
                    recursive: false
                },
                'funky-bind': {
                    method: 'funkyBind'
                }
            })
                .map(ignoreFields);

            defaultManifest.forEach((item, i) => {

                expect(item).to.equal(manifest[i]);
            });

            const defaultLength = defaultManifest.length;
            expect(manifest.length).to.equal(defaultLength + 2);

            expect(manifest[defaultLength]).to.equal({
                place: 'funky-routes',
                method: 'funkyRoutes',
                recursive: false
            });

            expect(manifest[defaultLength + 1]).to.equal({
                place: 'funky-bind',
                method: 'funkyBind'
            });
        });

        it('respects before/after options for additional items.', () => {

            const defaultManifest = HauteCouture.manifest().map(ignoreFields);
            const manifest = HauteCouture.manifest({
                'funky-routes': {
                    method: 'funkyRoutes',
                    before: ['auth/default'],
                    after: ['auth/strategies']
                }
            })
                .map(ignoreFields);

            const indexOf = (place, mf) => {

                let index = null;

                for (let i = 0; i < mf.length; ++i) {
                    const item = mf[i];

                    if (item.place === place) {
                        index = i;
                        break;
                    }
                }

                return index;
            };

            // Default manifest has strategies and defaults side-by-side

            const defStrategiesIndex = indexOf('auth/strategies', defaultManifest);

            expect(defaultManifest[defStrategiesIndex].place).to.equal('auth/strategies');
            expect(defaultManifest[defStrategiesIndex + 1].place).to.equal('auth/default');

            // New manifest has it between strategies and defaults

            const funkyIndex = indexOf('funky-routes', manifest);

            expect(funkyIndex).to.be.above(indexOf('auth/strategies', manifest));
            expect(funkyIndex).to.be.below(indexOf('auth/default', manifest));
        });

        it('applies defaults with $default.', () => {

            const defaultManifest = HauteCouture.manifest().map(ignoreFields);
            const manifest = HauteCouture.manifest({
                $default: {
                    recursive: false,
                    meta: { exampleUseStrict: false }
                }
            })
                .map(ignoreFields);

            expect(manifest.length).to.equal(defaultManifest.length);

            defaultManifest.forEach((item, i) => {

                expect(item).to.not.equal(manifest[i]);
                expect({ ...item, recursive: false, meta: { exampleUseStrict: false } }).to.equal(manifest[i]);
            });
        });

        it('applies defaults with default symbol.', () => {

            const defaultManifest = HauteCouture.manifest().map(ignoreFields);
            const manifest = HauteCouture.manifest({
                [HauteCouture.default]: {
                    recursive: false,
                    meta: { exampleUseStrict: false }
                },
                $default: {
                    method: 'funkyRoutes',
                    recursive: true
                }
            })
                .map(ignoreFields);

            expect(manifest.length).to.equal(defaultManifest.length + 1);

            defaultManifest.forEach((item, i) => {

                expect(item).to.not.equal(manifest[i]);
                expect({ ...item, recursive: false, meta: { exampleUseStrict: false } }).to.equal(manifest[i]);
            });

            expect(manifest[manifest.length - 1]).to.equal({
                place: '$default',
                method: 'funkyRoutes',
                recursive: true,
                meta: {
                    exampleUseStrict: false
                }
            });
        });

        it('sets dirname on items when passed.', () => {

            const manifest = HauteCouture.manifest({
                routes: false,
                'funky-routes': { method: 'funkyRoutes' }
            }, '/some/directory');

            Joi.assert(manifest, Joi.array().items({
                place: Joi.string().regex(/[\w\.]+/),
                method: Joi.string().regex(/[\w\.]+/),
                signature: Joi.array().items(Joi.string().regex(/^\[?\w+\]?$/)),
                list: Joi.boolean(),
                useFilename: Joi.func(),
                recursive: Joi.boolean(),
                exclude: Joi.func(),
                include: Joi.func(),
                meta: Joi.object(),
                dirname: Joi.valid('/some/directory').required()
            }));

            const summarize = (item) => `${item.method}() at ${item.place}`;
            const summary = manifest.map(summarize);

            expect(summary).to.equal([
                'path() at path',
                'cache.provision() at caches',
                'register() at plugins',
                'views() at view-manager',
                'decorate() at decorations',
                'expose() at expose',
                'state() at cookies',
                'registerModel() at models',
                'registerService() at services',
                'bind() at bind',
                'dependency() at dependencies',
                'method() at methods',
                'ext() at extensions',
                'auth.scheme() at auth/schemes',
                'auth.strategy() at auth/strategies',
                'auth.default() at auth/default',
                'subscription() at subscriptions',
                'validator() at validator',
                'funkyRoutes() at funky-routes'
            ]);
        });
    });

    describe('.hc.js', () => {

        it('specifies amendments for the current directory used by haute-couture.', async () => {

            const server = Hapi.server();

            const plugin = {
                name: 'my-hc-plugin',
                register: HauteCouture.composeWith({
                    dirname: `${__dirname}/closet/hc-file`
                })
            };

            await server.register(plugin);

            expect(server.methods.controllerOne()).to.equal('controller-one');
            expect(server.methods.controllerTwo()).to.equal('controller-two');
            expect(server.methods.methodOne).to.not.exist();
            expect(server.methods.methodTwo).to.not.exist();
        });

        it('is ignored when amendments are passed explicitly.', async () => {

            const server = Hapi.server();

            const plugin = {
                name: 'my-hc-plugin',
                register: HauteCouture.composeWith({
                    dirname: `${__dirname}/closet/hc-file`,
                    amendments: {}
                })
            };

            await server.register(plugin);

            expect(server.methods.controllerOne).to.not.exist();
            expect(server.methods.controllerTwo).to.not.exist();
            expect(server.methods.methodOne()).to.equal('method-one');
            expect(server.methods.methodTwo()).to.equal('method-two');
        });

        it('causes an error if it has a bad require.', async () => {

            const server = Hapi.server();

            await expect(HauteCouture.compose(server, {}, {
                dirname: `${__dirname}/closet/bad-require-hc-file`
            })).to.reject(/Cannot find module/);
        });

        it('causes an error if it has a general runtime exception.', async () => {

            const server = Hapi.server();

            await expect(HauteCouture.compose(server, {}, {
                dirname: `${__dirname}/closet/bad-syntax-hc-file`
            })).to.reject(SyntaxError, /unexpected token/i);
        });
    });
});
