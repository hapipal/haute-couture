'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
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
    };

    const notUsing = (files) => {

        Renamer.rename(Renamer.replace({
            files: files.map(makeAbsolute),
            find: '$',
            replace: '.off',
            regex: true
        }));
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

        notUsing(['connections.js', 'decorations/server.bad.test-dec.js']);

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

    it('registers plugins in plugins.js.', (done) => {

        expect(bigServer.registrations.vision).to.exist();
        expect(bigServer.registrations['test-dep']).to.exist();
        done();
    });

    it('enforces dependencies in dependencies/.', (done) => {

        expect(bigServer.app.deps).have.length(2);
        expect(bigServer.app.deps).to.only.contain(['vision', 'test-dep']);
        done();
    });
});
