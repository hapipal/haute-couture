'use strict';

const { Model } = require('@hapipal/schwifty');

module.exports = class MyNamedModel extends Model {
    static tableName = 'MyNamedModel'
};
