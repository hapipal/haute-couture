'use strict';

module.exports = {
    scheme: (server, options) => {

        return {
            authenticate: (request, h) => {

                return h.authenticated({ credentials: { testScheme: options } });
            }
        };
    }
};
