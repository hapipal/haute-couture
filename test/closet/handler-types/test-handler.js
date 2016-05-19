'use strict';

module.exports = {
    method: (route, options) => (request, reply) => reply({ testHandler: options })
};
