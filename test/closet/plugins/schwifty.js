'use strict';

const Schwifty = require('schwifty');

module.exports = {
    plugins: {
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
