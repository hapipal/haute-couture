'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const HauteCouture = require('..');
const Closet = require('./closet');

// Test shortcuts

const lab = exports.lab = Lab.script();
const before = lab.before;
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;

const internals = {};

describe('HauteCouture', () => {

    const server = new Hapi.Server();

    before((done) => {

        server.connection();
        server.register([Closet], (err) => done(err));
    });

    it('defaults to look in the caller\'s directory.', (done) => {

        done();
    });

});
