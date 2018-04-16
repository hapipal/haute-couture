'use strict';

const Hapi = require('hapi');

(async () => {

    const server = Hapi.server();

    await server.register(require('./c'));
    await server.start();

    console.log(`Started server ${server.info.uri}`);
})();

process.on('unhandledRejection', (err) => { throw err; });
