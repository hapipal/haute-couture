'use strict';

module.exports = {
    scheme: (server, options) => {

        return {
            authenticate: (request, reply) => {

                return reply.continue({ credentials: { testScheme: options } });
            }
        };
    }
};
