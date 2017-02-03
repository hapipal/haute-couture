'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Domain = require('domain');
const Hapi = require('hapi');
const Hoek = require('hoek');
const Renamer = require('renamer');
const Glob = require('glob');
const Closet = require('./closet');
const HauteCouture = require('..');

// Test shortcuts

const lab = exports.lab = Lab.script();
const before = lab.before;
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

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

    const using = (files) => {

        const offFiles = allFiles().filter((file) => files.indexOf(file) === -1);

        Renamer.rename(Renamer.replace({
            files: offFiles.map(makeAbsolute),
            find: '$',
            replace: '.off',
            regex: true
        }));

        invalidateCache();
    };

    const notUsing = (files) => {

        Renamer.rename(Renamer.replace({
            files: files.map(makeAbsolute),
            find: '$',
            replace: '.off',
            regex: true
        }));

        invalidateCache();
    };

    const reset = () => {

        Renamer.rename(Renamer.replace({
            files: allFiles().map(makeAbsolute),
            find: '\\.off$',
            replace: '',
            regex: true
        }));
    };

    const bigServer = new Hapi.Server();

    before((done) => {

        reset();
        notUsing([
            'connections',
            'models/bad-arr-model.js',
            'decorations/server.bad.test-dec.js',
            'route-transforms/bad-arr-transform.js'
        ]);

        bigServer.connection();
        bigServer.register(Closet, (err) => {

            reset();

            if (err) {
                return done(err);
            }

            bigServer.initialize(done);
        });
    });

    it('defaults to look in the caller\'s directory.', (done) => {

        // Just an example to show it used the caller's directory
        expect(bigServer.registrations.vision).to.exist();
        done();
    });

    it('can look in specific directory.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const plugin = HauteCouture(`${__dirname}/closet/specific`);
        plugin.attributes = { name: 'my-specific-plugin' };

        server.register(plugin, (err) => {

            if (err) {
                return done(err);
            }

            // Just an example to show it used the caller's directory
            expect(server.registrations['specific-sub-plugin']).to.exist();
            done();
        });
    });

    it('registers plugins in plugins/.', (done) => {

        expect(bigServer.registrations.dogwater).to.exist();

        // plugins specified, but not an array and no register
        expect(bigServer.registrations.chairo).to.exist();

        // No plugins specified
        expect(bigServer.registrations.vision).to.exist();

        // plugins specified as an array
        expect(bigServer.registrations.loveboat).to.exist();

        // Passes options
        expect(bigServer.registrations['test-dep']).to.exist();
        expect(bigServer.app.sawPluginOptions).to.equal('/options');

        done();
    });

    it('enforces dependencies in dependencies/.', (done) => {

        expect(bigServer.app.deps).have.length(2);
        expect(bigServer.app.deps).to.only.contain(['vision', 'test-dep']);
        done();
    });

    it('provisions caches in caches/.', (done) => {

        expect(() => {

            bigServer.cache({ cache: 'my-named-cache', segment: 'seg' });
            bigServer.cache({ cache: 'test-cache', segment: 'seg' });
        }).to.not.throw();

        done();
    });

    it('registers server methods in methods/, respecting bound context.', (done) => {

        bigServer.methods.myNamedMethod((err, resultOne) => {

            expect(err).to.not.exist();
            expect(resultOne).to.equal('my-named-method');

            bigServer.methods.testMethod((err, resultTwo) => {

                expect(err).to.not.exist();
                expect(resultTwo).to.equal('test-method');

                bigServer.methods.bindMethod((err, resultThree) => {

                    expect(err).to.not.exist();
                    expect(resultThree).to.equal({ someContext: true });
                    done();
                });
            });
        });
    });

    it('registers seneca plugins via chairo in seneca-plugins/.', (done) => {

        expect(bigServer.seneca.export('my-named-plugin')).to.exist();
        expect(bigServer.seneca.export('echo')).to.exist();
        done();
    });

    it('registers chairo actions in action-methods/.', (done) => {

        bigServer.methods.myNamedAction({ vals: [1, 3] }, (err, resultOne) => {

            expect(err).to.not.exist();
            expect(resultOne).to.equal({ average: 2 });

            bigServer.methods.testAction({ vals: [2, 10] }, (err, resultTwo) => {

                expect(err).to.not.exist();
                expect(resultTwo).to.equal({ result: 20 });
                done();
            });
        });

    });

    it('registers view manager in view-manager.js.', (done) => {

        expect(bigServer.app.realm.plugins.vision.manager).to.exist();
        done();
    });

    it('registers decorations in decorations/.', (done) => {

        expect(bigServer.myNamedDec()).to.equal('server.myNamedDec()');
        expect(bigServer.testDec()).to.equal('server.testDec()');
        expect(bigServer.anotherTestDec()).to.equal('server.anotherTestDec()');
        done();
    });

    it('registers custom handler types in handler-types/.', (done) => {

        bigServer.route({
            method: 'get',
            path: '/my-named-handler',
            handler: { myNamedHandler: { some: 'named-options' } }
        });

        bigServer.route({
            method: 'get',
            path: '/test-handler',
            handler: { testHandler: { some: 'test-options' } }
        });

        bigServer.inject({
            method: 'get',
            url: '/my-named-handler'
        }, (resOne) => {

            expect(resOne.result).to.equal({ myNamedHandler: { some: 'named-options' } });

            bigServer.inject({
                method: 'get',
                url: '/test-handler'
            }, (resTwo) => {

                expect(resTwo.result).to.equal({ testHandler: { some: 'test-options' } });
                done();
            });
        });
    });

    it('registers extensions in extensions/.', (done) => {

        bigServer.route({
            method: 'get',
            path: '/extensions',
            handler: (request, reply) => reply()
        });

        bigServer.inject({
            method: 'get',
            url: '/extensions'
        }, (res) => {

            expect(res.request.app.lifecycle).to.equal([
                'onPreAuth', 'onPostAuth',
                'onPreHandler', 'onPostHandler'
            ]);
            done();
        });

    });

    it('exposes key-value pairs in expose/.', (done) => {

        const plugin = bigServer.plugins['my-plugin'];
        expect(plugin.myNamedExpose).to.equal('my-named-expose');
        expect(plugin.testExpose).to.equal('test-expose');
        done();
    });

    it('sets bind context in bind.js.', (done) => {

        expect(bigServer.app.realm.settings.bind).to.equal({ someContext: true });
        done();
    });

    it('sets server path prefix in path.js.', (done) => {

        expect(bigServer.app.realm.settings.files.relativeTo).to.equal(`${__dirname}/closet`);
        done();
    });

    it('defines auth schemes in auth/schemes/ and strategies in auth/strategies/.', (done) => {

        bigServer.route({
            method: 'get',
            path: '/my-named-strategy',
            handler: (request, reply) => reply(),
            config: { auth: 'my-named-strategy' }
        });

        bigServer.route({
            method: 'get',
            path: '/test-strategy',
            handler: (request, reply) => reply(),
            config: { auth: 'test-strategy' }
        });

        bigServer.inject({
            method: 'get',
            url: '/my-named-strategy'
        }, (resOne) => {

            expect(resOne.request.auth.credentials).to.equal({
                myNamedScheme: {
                    myNamedStrategy: true
                }
            });

            bigServer.inject({
                method: 'get',
                url: '/test-strategy'
            }, (resTwo) => {

                expect(resTwo.request.auth.credentials).to.equal({
                    testScheme: {
                        testStrategy: true
                    }
                });
                done();
            });
        });

    });

    it('defines default auth strategy in auth/default.js.', (done) => {

        const conn = bigServer.connections[0];
        expect(conn.auth.settings.default.strategies).to.equal(['my-named-strategy']);
        done();
    });

    it('defines cookies in cookies/.', (done) => {

        const conn = bigServer.connections[0];
        expect(conn.states.cookies['my-named-cookie']).to.exist();
        expect(conn.states.cookies['test-cookie']).to.exist();
        expect(conn.states.cookies['test-cookie'].ttl).to.equal(666);
        done();
    });

    it('defines loveboat transforms in route-transforms/.', (done) => {

        const transforms = bigServer.app.realm.plugins.loveboat.transforms.nodes;
        const transformNames = transforms.map((transform) => transform.transform.name).sort();

        expect(transformNames).to.equal(['my-named-transform', 'test-transform']);
        done();
    });

    it('defines loveboat routes in routes-loveboat/.', (done) => {

        const route = bigServer.lookup('loveboat');
        expect(route).to.exist();
        expect(route.settings.app).to.equal({
            myNamedTransform: true,
            testTransform: true
        });
        done();
    });

    it('defines dogwater models in models/.', (done) => {

        const collections = bigServer.collections(true);
        expect(collections).to.have.length(2);
        expect(collections['my-named-model']).to.exist();
        expect(collections['test-model']).to.exist();
        done();
    });

    it('defines schwifty models in schwifty-models/.', (done) => {

        const models = bigServer.models(true);
        expect(models).to.have.length(1);
        expect(models.MyNamedModel).to.exist();
        done();
    });

    it('defines routes in routes/.', (done) => {

        expect(bigServer.lookup('my-id-route')).to.exist();
        expect(bigServer.lookup('test-route')).to.exist();
        expect(bigServer.lookup('arr-routes')).to.not.exist();
        expect(bigServer.match('get', '/arr-route-one')).to.exist();
        expect(bigServer.match('get', '/arr-route-two')).to.exist();
        done();
    });

    it('registers connections in connections/.', (done, onCleanup) => {

        onCleanup((next) => {

            reset();
            return next();
        });

        const server = new Hapi.Server();

        const plugin = HauteCouture(`${__dirname}/closet`);
        plugin.attributes = {
            name: 'my-conn-plugin',
            connections: false
        };

        using([
            'connections',
            'connections/labeled-connection.js',
            'connections/test-connection.js'
        ]);

        server.register(plugin, (err) => {

            if (err) {
                return done(err);
            }

            expect(server.select('my-labeled-connection').connections.length).to.equal(1);
            expect(server.select('test-connection').connections.length).to.equal(1);
            done();
        });
    });

    it('does not apply filename to decorations with more than two parts.', (done, onCleanup) => {

        onCleanup((next) => {

            reset();
            return next();
        });

        const server = new Hapi.Server();
        server.connection();

        using([
            'decorations',
            'decorations/server.bad.test-dec.js'
        ]);

        expect(() => {

            server.register(Closet, Hoek.ignore);
        }).to.throw(/Missing decoration property name/);

        done();
    });

    it('does not apply filename to loveboat transforms in array.', (done, onCleanup) => {

        onCleanup((next) => {

            reset();
            return next();
        });

        const server = new Hapi.Server();
        server.connection();

        using([
            'plugins',
            'plugins/my-loveboat.js',
            'route-transforms',
            'route-transforms/bad-arr-transform.js'
        ]);

        const domain = Domain.create();

        domain.on('error', (err) => {

            expect(err.message).to.match(/\"name\" is required/);
            done();
        });

        domain.run(() => server.register(Closet, Hoek.ignore));
    });

    it('does not apply filename to dogwater models in array.', (done, onCleanup) => {

        onCleanup((next) => {

            reset();
            return next();
        });

        const server = new Hapi.Server();
        server.connection();

        using([
            'plugins',
            'plugins/my-dogwater.js',
            'models',
            'models/bad-arr-model.js'
        ]);

        const domain = Domain.create();

        domain.on('error', (err) => {

            expect(err.message).to.match(/\"identity\" is required/);
            done();
        });

        domain.run(() => server.register(Closet, Hoek.ignore));
    });

    it('accepts additional manifest items.', (done, onCleanup) => {

        onCleanup((next) => {

            reset();
            return next();
        });

        const server = new Hapi.Server();
        server.connection();

        const called = {};
        server.decorate('server', 'special', function (myArg) {

            called.myArg = myArg;
            called.length = arguments.length;
        });

        const plugin = HauteCouture(`${__dirname}/closet`, [{
            place: 'special',
            method: 'special',
            signature: ['myArg'],
            list: false
        }]);

        plugin.attributes = { name: 'my-special-plugin' };

        using(['special.js']);

        server.register(plugin, (err) => {

            if (err) {
                return done(err);
            }

            expect(called.myArg).to.equal('mySpecialValue');
            expect(called.length).to.equal(1);
            done();
        });
    });

    it('allows options to be optional', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const plugin = (srv, options, next) => {

            HauteCouture(`${__dirname}/closet/specific`)(srv, (err) => {

                if (err) {
                    return next(err);
                }

                expect(srv.registrations['specific-sub-plugin']).to.exist();

                next();
            });
        };

        plugin.attributes = { name: 'no-options-plugin' };

        server.register(plugin, (err) => {

            if (err) {
                return done(err);
            }

            expect(server.registrations['no-options-plugin']).to.exist();
            done();
        });
    });

    it('supports promises.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const plugin = (srv, options, next) => {

            HauteCouture(`${__dirname}/closet/specific`)(srv, options)
            .then(() => {

                expect(srv.registrations['specific-sub-plugin']).to.exist();
                next();
            })
            .catch((err) => {

                next(err);
            });
        };

        plugin.attributes = { name: 'promise-plugin' };

        server.register(plugin, (err) => {

            if (err) {
                return done(err);
            }

            expect(server.registrations['promise-plugin']).to.exist();
            done();
        });
    });

    it('allows options, next to be optional.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        const plugin = (srv, options, next) => {

            HauteCouture(`${__dirname}/closet/specific`)(srv)
            .then(() => {

                expect(srv.registrations['specific-sub-plugin']).to.exist();
                next();
            })
            .catch((err) => {

                next(err);
            });
        };

        plugin.attributes = { name: 'no-options-no-callback-plugin' };

        server.register(plugin, (err) => {

            if (err) {
                return done(err);
            }

            expect(server.registrations['no-options-no-callback-plugin']).to.exist();
            done();
        });
    });

    it('promise returns error in catch.', (done) => {

        const server = new Hapi.Server();
        server.connection();

        HauteCouture(`${__dirname}/closet/bad-plugin`)(server)
        .then(() => {

            return done(new Error('Shouldn\'t make it here!'));
        })
        .catch((err) => {

            expect(err.message).to.endWith('Ya blew it!');
            done();
        });
    });
});
