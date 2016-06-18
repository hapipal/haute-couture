'use strict';

module.exports = {
    plugin: function () {

        this.add({ role: 'my', cmd: 'average' }, (msg, cb) => {

            return cb(null, { average: (msg.vals[0] + msg.vals[1]) / 2 });
        });

        this.add({ role: 'my', cmd: 'mult' }, (msg, cb) => {

            return cb(null, { result: msg.vals[0] * msg.vals[1] });
        });

        return {
            name: 'my-named-plugin',
            export: {}
        };
    }
};
