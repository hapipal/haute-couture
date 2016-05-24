'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
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
            'decorations/server.bad.test-dec.js'
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

    it('registers plugins in plugins.js.', (done) => {

        expect(bigServer.registrations.vision).to.exist();
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

    it('registers server methods in methods/.', (done) => {

        bigServer.methods.myNamedMethod((err, resultOne) => {

            expect(err).to.not.exist();
            expect(resultOne).to.equal('my-named-method');

            bigServer.methods.testMethod((err, resultTwo) => {

                expect(err).to.not.exist();
                expect(resultTwo).to.equal('test-method');
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
        }).to.throw('Missing decoration property name');

        done();
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

});
