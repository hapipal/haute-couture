'use strict';

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
