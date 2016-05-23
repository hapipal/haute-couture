'use strict';

module.exports = {
    method: (route, options) => {

        return (request, reply) => reply({ testHandler: options });
    }
};
