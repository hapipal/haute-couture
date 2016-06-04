'use strict';

const Haute = require('haute');
const Path = require('path');
const ParentModule = require('parent-module');
const Manifest = require('./manifest');

const internals = {};

module.exports = (dirname, manifestExtras) => {

    dirname = dirname || Path.dirname(ParentModule());

    const manifest = Manifest.concat(manifestExtras || []);

    return (server, options, next) => {

        if (typeof next === 'function') {
            return Haute(dirname, manifest)(server, options, next);
        }
        else if (typeof options === 'function') {
            next = options;
            return Haute(dirname, manifest)(server, next);
        }


        return new Promise((resolve, reject) => {

            const cb = function (err) {

                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            };

            if (typeof options !== 'undefined') {
                Haute(dirname, manifest)(server, options, cb);
            }
            else {
                Haute(dirname, manifest)(server, cb);
            }
        });
    };
};
