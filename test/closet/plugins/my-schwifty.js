'use strict';

const Schwifty = require('schwifty');

module.exports = {
    plugins: {
        register: Schwifty,
        options: {
            knex: {
                client: 'sqlite3',
                connection: {
                    filename: ':memory:'
                },
                useNullAsDefault: true
            }
        }
    }
};
