'use strict';

const Joi = require('joi');

module.exports = {
    method: 'get',
    path: '/validator-route',
    options: {
        validate: {
            query: {
                x: Joi.string()
            }
        },
        handler: () => 'validator-route'
    }
};
