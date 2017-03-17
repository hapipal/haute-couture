'use strict';

const Haute = require('haute');
const Path = require('path');
const ParentModule = require('parent-module');
const Manifest = require('./manifest');

const internals = {};

exports.manifest = Manifest;

exports.using = (dirname, manifestAmendments) => {

    if (dirname && typeof dirname !== 'string') {
        manifestAmendments = dirname;
        dirname = null;
    }

    dirname = dirname || Path.dirname(ParentModule());

    const manifest = Manifest.create(manifestAmendments);
    const haute = Haute(dirname, manifest);

    return (server, options, next) => {

        if (typeof next === 'function') {
            return haute(server, options, next);
        }
        else if (typeof options === 'function') {
            next = options;
            return haute(server, next);
        }

        return new Promise((resolve, reject) => {

            const cb = (err) => {

                if (err) {
                    return reject(err);
                }

                return resolve();
            };

            if (typeof options === 'undefined') {
                return haute(server, cb);
            }

            return haute(server, options, cb);
        });
    };
};
