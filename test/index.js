'use strict';

// Load modules

const Path = require('path');
const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Joi = require('joi');
const Renamer = require('renamer');
const Glob = require('glob');
const Nes = require('nes');
const Teamwork = require('teamwork');
const Closet = require('./closet');
const HauteCouture = require('..');

// Test shortcuts

const { before, describe, it } = exports.lab = Lab.script();
const { expect } = Code;

const internals = {};

describe('HauteCouture', () => {

    const invalidateCache = () => {

        Object.keys(require.cache).forEach((key) => {

            delete require.cache[key];
        });

        // It's dirty, but without this requiring a missing module that was
        // previously available will error with ENOENT rather than MODULE_NOT_FOUND,
        // which isn't what haute would expect.

        Object.keys(module.constructor._pathCache).forEach((key) => {

            delete module.constructor._pathCache[key];
        });
    };

    const makeAbsolute = (file) => `${__dirname}/closet/${file}`;

    const allFiles = () => {

        return Glob.sync(`${__dirname}/closet/**`)
            .map((file) => file.replace(`${__dirname}/closet`, ''))
            .map((file) => file.replace(/^\//, ''))
            .filter((file) => ['', 'index.js'].indexOf(file) === -1);
    };

    const renamer = new Renamer();

    const using = (files) => {

        const offFiles = allFiles().filter((file) => files.indexOf(file) === -1);

        renamer.rename({
            files: offFiles.map(makeAbsolute),
            find: /$/,
            replace: '.off'
        });

        invalidateCache();
    };

    const notUsing = (files) => {

        renamer.rename({
            files: files.map(makeAbsolute),
            find: /$/,
            replace: '.off'
        });

        invalidateCache();
    };

    const reset = () => {

        renamer.rename({
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
            'methods/bad-arr-method.js'
        ]);

        await bigServer.register(Closet);

        reset();

        await bigServer.initialize();
    });

    it('defaults to look in the caller\'s directory.', () => {

        // Just an example to show it used the caller's directory
        expect(bigServer.registrations.vision).to.exist();
    });

    it('can look in specific directory.', async () => {

        const server = Hapi.server();

        const plugin = {
            register: HauteCouture.using(`${__dirname}/closet/specific`),
            name: 'my-specific-plugin'
        };

        await server.register(plugin);

        // Just an example to show it used the caller's directory
        expect(server.registrations['specific-sub-plugin']).to.exist();
    });

    it('allows one to amend the haute manifest.', async () => {

        const server = Hapi.server();

        const amendments = { remove: ['plugins'] };
        const plugin = {
            register: HauteCouture.using(`${__dirname}/closet/specific`, amendments),
            name: 'my-specific-plugin'
        };

        await server.register(plugin);

        // From the prev test we can see this would have existed were the manifest not altered
        expect(server.registrations['specific-sub-plugin']).to.not.exist();
    });

    it('allows one to amend the haute manifest, omitting dirname.', async () => {

        const server = Hapi.server();

        const defaultManifest = HauteCouture.manifest.create();
        const placeOf = (item) => item.place;

        // Remove all instructions
        const amendments = { remove: defaultManifest.map(placeOf) };
        const plugin = {
            register: HauteCouture.using(amendments),
            name: 'my-specific-plugin'
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
            register: HauteCouture.using(`${__dirname}/closet`, [{
                place: 'special',
                method: 'special',
                signature: ['myArg'],
                list: false
            }])
        };

        using(['special.js']);

        await server.register(plugin);

        expect(called.myArg).to.equal('mySpecialValue');
        expect(called.length).to.equal(1);
    });

    it('registers plugins in plugins/.', () => {

        // Plugins specified, but not an array and no `plugin`
        expect(bigServer.registrations.schwifty).to.exist();

        // No plugins specified
        expect(bigServer.registrations.vision).to.exist();

        // No plugins specified, with scoped module
        expect(bigServer.registrations['@softonic/hapi-error-logger']).to.exist();

        // Passes options, plugins specified as array
        expect(bigServer.registrations['test-dep']).to.exist();

        expect(bigServer.app.sawPluginOptions).to.equal('/options');
    });

    it('enforces dependencies in dependencies/.', () => {

        expect(bigServer.app.deps).have.length(2);
        expect(bigServer.app.deps).to.only.contain(['vision', 'test-dep']);
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

    it('defines subscriptions in subscriptions/.', async () => {

        const team = new Teamwork();
        await bigServer.start();
        const client = new Nes.Client(`ws://localhost:${ bigServer.info.port }`);
        await client.connect();
        await client.subscribe('/subscription-test', (data) => {

            expect(data).to.equal({ id : 1, message: 'test' });
            team.attend();
        });

        await bigServer.publish('/subscription-test', { id : 1, message: 'test' });
        await team.work;
        client.disconnect();
        await bigServer.stop();
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

    it('allows options to be optional', async () => {

        const server = Hapi.server();

        const plugin = {
            name: 'no-options-plugin',
            register: async (srv, options) => {

                await HauteCouture.using(`${__dirname}/closet/specific`)(srv);
                expect(srv.registrations['specific-sub-plugin']).to.exist();
            }
        };

        await server.register(plugin);

        expect(server.registrations['no-options-plugin']).to.exist();
    });

    it('rejects when something bad happens.', async () => {

        const server = Hapi.server();

        await expect(HauteCouture.using(`${__dirname}/closet/bad-plugin`)(server)).to.reject(/Ya blew it!/);
    });

    it('does not recurse by default.', async () => {

        const server = Hapi.server();

        const plugin = {
            register: HauteCouture.using(`${__dirname}/closet/recursive`),
            name: 'my-recursive-plugin'
        };

        await server.register(plugin);

        expect(server.table().map((r) => r.settings.id)).to.equal([
            'item-one'
        ]);
    });

    it('recurses, skipping helpers by default.', async () => {

        const server = Hapi.server();

        const plugin = {
            register: HauteCouture.using(`${__dirname}/closet/recursive`, {
                recursive: true
            }),
            name: 'my-recursive-plugin'
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
            register: HauteCouture.using(`${__dirname}/closet/recursive`, {
                recursive: true,
                exclude: (filename, path) => {

                    return path.split(Path.sep).includes('a') ||
                        path.split(Path.sep).includes('helpers');
                }
            }),
            name: 'my-recursive-plugin'
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
            register: HauteCouture.using(`${__dirname}/closet/recursive`, {
                recursive: true,
                include: (filename, path) => {

                    return path.split(Path.sep).includes('one');
                }
            }),
            name: 'my-recursive-plugin'
        };

        await server.register(plugin);

        expect(server.table().map((r) => r.settings.id)).to.equal([
            'one-a-item-one',
            'one-a-item-two',
            'one-b-item-one'
        ]);
    });

    describe('manifest', () => {

        describe('create()', () => {

            const ignoreFields = ({ include, exclude, ...item }) => item;

            it('returns the default haute manifest.', () => {

                const manifest = HauteCouture.manifest.create();
                Joi.assert(manifest, Joi.array().items({
                    place: Joi.string().regex(/[\w\.]+/),
                    method: Joi.string().regex(/[\w\.]+/),
                    signature: Joi.array().items(Joi.string().regex(/^\[?\w+\]?$/)),
                    async: Joi.boolean(),
                    list: Joi.boolean(),
                    useFilename: Joi.func(),
                    recursive: Joi.boolean(),
                    exclude: Joi.func(),
                    include: Joi.func()
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
                    'schwifty() at models',
                    'registerService() at services',
                    'bind() at bind',
                    'dependency() at dependencies',
                    'method() at methods',
                    'ext() at extensions',
                    'auth.scheme() at auth/schemes',
                    'auth.strategy() at auth/strategies',
                    'auth.default() at auth/default',
                    'subscription() at subscriptions',
                    'route() at routes'
                ]);
            });

            it('returns the default haute manifest with extras.', () => {

                const manifest = HauteCouture.manifest.create(null, true);

                expect(manifest.some((item) => item.example)).to.equal(true);
                expect(manifest.some((item) => item.after)).to.equal(true);

                Joi.assert(manifest, Joi.array().items({
                    place: Joi.string().regex(/[\w\.]+/),
                    method: Joi.string().regex(/[\w\.]+/),
                    signature: Joi.array().items(Joi.string().regex(/^\[?\w+\]?$/)),
                    async: Joi.boolean(),
                    list: Joi.boolean(),
                    useFilename: Joi.func(),
                    recursive: Joi.boolean(),
                    exclude: Joi.func(),
                    include: Joi.func(),
                    before: Joi.array().items(Joi.string()).single(),
                    after: Joi.array().items(Joi.string()).single(),
                    example: Joi.any()
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
                    'schwifty() at models',
                    'registerService() at services',
                    'bind() at bind',
                    'dependency() at dependencies',
                    'method() at methods',
                    'ext() at extensions',
                    'auth.scheme() at auth/schemes',
                    'auth.strategy() at auth/strategies',
                    'auth.default() at auth/default',
                    'subscription() at subscriptions',
                    'route() at routes'
                ]);
            });

            it('removes single item from the manifest by place.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    remove: 'routes'
                })
                    .map(ignoreFields);

                expect(manifest.length).to.equal(defaultManifest.length - 1);

                manifest.forEach((item, i) => {

                    expect(item).to.equal(defaultManifest[i]);
                });
            });

            it('removes items from the manifest by place.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    remove: ['subscriptions', 'routes'] // Bottom two
                })
                    .map(ignoreFields);

                expect(manifest.length).to.equal(defaultManifest.length - 2);

                manifest.forEach((item, i) => {

                    expect(item).to.equal(defaultManifest[i]);
                });
            });

            it('replaces items in the manifest by place.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    add: [{
                        place: 'routes',
                        method: 'myRoute'
                    }]
                })
                    .map(ignoreFields);

                const allOthers = (item) => item.place !== 'routes';
                expect(manifest.filter(allOthers)).to.equal(defaultManifest.filter(allOthers));

                const routeItem = manifest.find((item) => item.place === 'routes');
                expect(routeItem).to.equal({
                    place: 'routes',
                    method: 'myRoute',
                    recursive: false
                });
            });

            it('replaces items in the manifest by place.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    add: [
                        {
                            place: 'routes',
                            method: 'myRoute'
                        },
                        {
                            place: 'models',
                            method: 'mySchwifty'
                        }
                    ]
                })
                    .map(ignoreFields);

                const allOthers = (item) => item.place !== 'routes' && item.place !== 'models';
                expect(manifest.filter(allOthers)).to.equal(defaultManifest.filter(allOthers));

                const routeItem = manifest.find((item) => item.place === 'routes');
                expect(routeItem).to.equal({
                    place: 'routes',
                    method: 'myRoute',
                    recursive: false
                });

                const schwiftyItem = manifest.find((item) => item.place === 'models');
                expect(schwiftyItem).to.equal({
                    place: 'models',
                    method: 'mySchwifty',
                    recursive: false
                });
            });

            it('adds new items to the manifest.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    add: [
                        {
                            place: 'funky-routes',
                            method: 'funkyRoutes',
                            recursive: true
                        },
                        {
                            place: 'funky-bind',
                            method: 'funkyBind'
                        }
                    ]
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
                    recursive: true
                });

                expect(manifest[defaultLength + 1]).to.equal({
                    place: 'funky-bind',
                    method: 'funkyBind',
                    recursive: false
                });
            });

            it('adds new single item to the manifest.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    add: {
                        place: 'funky-routes',
                        method: 'funkyRoutes'
                    }
                })
                    .map(ignoreFields);

                defaultManifest.forEach((item, i) => {

                    expect(item).to.equal(manifest[i]);
                });

                const defaultLength = defaultManifest.length;
                expect(manifest.length).to.equal(defaultLength + 1);

                expect(manifest[defaultLength]).to.equal({
                    place: 'funky-routes',
                    method: 'funkyRoutes',
                    recursive: false
                });
            });

            it('respects before/after options for additional items.', () => {

                const defaultManifest = HauteCouture.manifest.create().map(ignoreFields);
                const manifest = HauteCouture.manifest.create({
                    add: {
                        place: 'funky-routes',
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
        });
    });

    describe('.hc.js', () => {

        it('specifies amendments for the current directory used by haute-couture.', async () => {

            const server = Hapi.server();

            const plugin = {
                name: 'my-hc-plugin',
                register: HauteCouture.using(`${__dirname}/closet/hc-file`)
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
                register: HauteCouture.using(`${__dirname}/closet/hc-file`, {})
            };

            await server.register(plugin);

            expect(server.methods.controllerOne).to.not.exist();
            expect(server.methods.controllerTwo).to.not.exist();
            expect(server.methods.methodOne()).to.equal('method-one');
            expect(server.methods.methodTwo()).to.equal('method-two');
        });

        it('causes an error if it has a bad require.', () => {

            const makePlugin = () => HauteCouture.using(`${__dirname}/closet/bad-require-hc-file`);

            expect(makePlugin).to.throw(/Cannot find module/);
        });

        it('causes an error if it has a general runtime exception.', () => {

            const makePlugin = () => HauteCouture.using(`${__dirname}/closet/bad-syntax-hc-file`);

            expect(makePlugin).to.throw(SyntaxError, /unexpected token/i);
        });
    });
});
