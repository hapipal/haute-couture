# haute-couture

File-based hapi plugin composer

[![Build Status](https://travis-ci.com/hapipal/haute-couture.svg?branch=main)](https://travis-ci.com/hapipal/haute-couture) [![Coverage Status](https://coveralls.io/repos/hapipal/haute-couture/badge.svg?branch=main&service=github)](https://coveralls.io/github/hapipal/haute-couture?branch=main)

Lead Maintainer - [Devin Ivy](https://github.com/devinivy)

## Installation
```sh
npm install @hapipal/haute-couture
```

## Introduction
This library will wire your hapi plugin together based simply upon where you place files and the contents of those files.  It has the ability to call nearly every configuration-related method in the hapi plugin API.  This means many good things!  Here are a few:

 - Route configurations placed in your `routes/` directory will be registered using `server.route()`.
 - You can place your authentication scheme in `auth/schemes.js` rather than calling `server.auth.scheme()`.
 - You can provision a cache simply by placing its configuration in `caches/my-cache-name.js`, and forget about `server.cache.provision()`.
 - You can still write all the custom plugin code you desire.
 - You can customize many aspects regarding how haute-couture composes your hapi plugin from files.

Haute-couture understands 19 hapi plugin methods: those for server methods, server/request decorations, request lifecycle extensions, route configuration, cookie definitions, [vision](https://github.com/hapijs/vision) view managers, [schwifty](https://github.com/hapipal/schwifty) models, [schmervice](https://github.com/hapipal/schmervice) services, and plenty more.  And if that's not enough, you can always teach it about more through its flexible [amendment](API.md#await-hautecouturecomposeserver-options-composeoptions) system.

## Usage
> See also the [API Reference](API.md)
>
> Haute-couture is intended for use with hapi v19+ and nodejs v12+, in addition to several optional peer hapi plugins noted in package.json (_see v3 for lower support_).

This library is not a hapi plugin: think of it instead as a useful subroutine of any hapi plugin.  The full documentation of the files and directories it recognizes can be found in the [API documentation](API.md#files-and-directories).

### Example
Here's an example of a very simple plugin that registers a single "pinger" route.

#### `index.js`
```js
const HauteCouture = require('@hapipal/haute-couture');

module.exports = {
  name: 'my-hapi-plugin',
  register: async (server, options) => {

    // Custom plugin code can go here

    await HauteCouture.compose(server, options);
  }
};
```

#### `routes/pinger.js`
```js
module.exports = {
  method: 'get',
  path: '/',
  options: {
    handler(request) {

      return { ping: 'pong' };
    }
  }
};
```
