# API Reference

### `HauteCouture.using([dirname], [amendments])`

Returns a function with the signature `async function(server, [options])`, identical in meaning to the signature of a [hapi plugin](https://github.com/hapijs/hapi/blob/master/API.md#plugins).  Invoking the function makes hapi plugin API calls on `server` as described [below](#files-and-directories).  Typically `server` will be a server object passed to a plugin and `options` will be plugin options.  However, `server` could be any hapi server object (such as the root server) and `options` are not required.  It takes the following options,

  - `dirname` - an absolute directory path in which to look for the files and directories described [below](#files-and-directories).  It defaults to the directory path of the caller.
  - `amendments` - specifies additions and/or removals of items in the **[haute](https://github.com/devinivy/haute)** manifest that is used to map directory structure to hapi plugin API calls.  May be either of,
    - An object,
      - `add` - a single or array of items to add to the hapi haute manifest.  Also may be a nested array of items (e.g. `[{}, [{}, {}]]`).  If any items have `place` equal to an item in the default manifest, the default manifest item will be replaced.  Supports the following additional keys per [haute manifest item](#structure-of-a-haute-manifest-item),
        - `before` - a single or array of `place` values for which the given item should be positioned prior to other items in the manifest.
        - `after` - a single or array of `place` values for which the given item should be positioned subsequent to other items in the manifest.
        - `example` - an example value for this item, primarily used by the [hpal CLI](https://github.com/hapipal/hpal).
      - `remove` - a single or array of `place` values of items that should be removed from the manifest.  This would be utilized to opt a file/directory out of usage by haute-couture.
      - `recursive` - when `true` this option causes files to be picked-up recursively within their directory rather than just files that live directly under `place`.  Flip this to true if you'd like to have a nested folder structure, e.g. `routes/users/login.js` versus `routes/users-login.js`.
      - `include` - may be a function `(filename, path) => Boolean` or a RegExp.  When this option is used, a file will only be used as a call when the function returns `true` or the RegExp matches `path`.
      - `exclude` - takes a function or RegExp, identically to `include`.  When this option is used, a file will only be used as a call when the function returns `false` or the RegExp does not match `path`.  This option defaults to exclude any file that lives under a directory named `helpers/`.
      - Any unrecognized properties listed here will be defaults for each generated manfiest item's `meta` property.  This may be used to configure behavior of other tools, such as the [hpal CLI](https://github.com/hapipal/hpal).
    - An array of items used identically to the `add` option above.

#### Specifying amendments with `.hc.js`

When a call to `HauteCouture.using([dirname], [amendments])` specifies no `amendments`, haute-couture will check the relevant directory `dirname` for a file named `.hc.js`.  Any amendments exported by this file are used identically to amendments passed as an argument.  This is a nice way to keep haute-couture-related configuration separate from your plugin code, and also offer a standard way for tools such as the [pal CLI](https://github.com/devinivy/paldo) to cater to your particular usage of haute-couture.

#### Amendment example

This example demonstrates how to use a `.hc.js` file in order to swap-out [schwifty's](https://github.com/hapipal/schwifty) handling of [Objection ORM](http://vincit.github.io/objection.js/) models for a much simplified handling of [Mongoose](https://mongoosejs.com) models.  You can even continue to use [`hpal make`](https://github.com/hapipal/hpal#hpal-make) to scaffold your Mongoose models inside the `models/` directory. Here is [another example](https://github.com/hk7math/hpal-mongo-example) for reference.

##### `index.js`
```js
'use strict';

const HauteCouture = require('haute-couture');
const Mongoose = require('mongoose');

module.exports = {
    name: 'my-hapi-plugin',
    register: async (server, options) => {

        // When registering this plugin pass something like this as plugin options:
        // { mongoURI: 'mongodb://localhost/test' }

        server.app.connection = Mongoose.createConnection(options.mongoURI);

        await HauteCouture.using()(server, options);
    }
};
```

##### `.hc.js`
```js
'use strict';

module.exports = {
    add: [{
        place: 'models',
        list: true,
        signature: ['name', 'schema'],
        method: (server, options, name, schema) => {

            const { connection } = server.app;

            // Access the Dog model as such in a route handler:
            // const { Dog } = request.server.app.models;

            server.app.models = server.app.models || {};
            server.app.models[name] = connection.model(name, schema);
        },
        // This example below isn't essential. But it allows you to use
        // `hpal make model <model-name>` in order to scaffold your
        // Mongoose models from the command line.
        example: {
            $requires: ['mongoose'],
            $value: {
                name: 'ModelName',
                schema: { $literal: 'new Mongoose.Schema({})'}
            }
        }
    }]
};
```

##### `models/dog.js`
```js
'use strict';

// Scaffolded using the CLI:
// npx hpal make model dog

const Mongoose = require('mongoose');

module.exports = {
    name: 'Dog',
    schema: new Mongoose.Schema({
        name: String
    })
};
```

### `HauteCouture.manifest.create([amendments, [includeExtras]])`

Returns the hapi **[haute](https://github.com/devinivy/haute)** manifest, incorporating optional `amendments` to the manifest as described in [`HauteCouture.using([dirname], [amendments])`](#hautecoutureusingdirname-amendments).  When `includeExtras` is `true` the manifest will include additional amendment information such as `before`, `after`, and `example` as described above.

### Files and directories
**haute-couture** is quite astute in mapping files and directories to hapi API calls.  And as seen in the comments of the [usage example](README.md#routespingerjs), it also infers configuration from filenames where applicable.

Files will always export an array of values (representing multiple API calls) or a single value (one API call).  When a hapi method takes more than one argument, a single value consists of an object whose keys are the names of the arguments and whose values are the intended argument values.  The format of the argument values come from the [hapi API](https://github.com/hapijs/hapi/blob/master/API.md) unless otherwise specified.

For example, a file defining a new server method (representing a call to `server.method(name, method)`) would export an object of the format `{ name, method }`.

Lastly, files can always export a function with signature `function(server, options)` or `async function(server, options)` that returns the intended value or array of values.

Here's the complete rundown of how files and directories are mapped to API calls.  The order here reflects the order in which the calls would be made.

> **But first, an important note.**
>
> Below you'll find that this library can be used in conjunction with several hapi plugins.  There is no way to properly express an "optional peer dependency" using npm, so here I am to tell you which versions of those plugins work with haute-couture.
>  - schwifty - 3.x.x through 4.x.x
>  - schmervice - 1.x.x
>  - nes - 7.x.x through 10.x.x
>  - vision - 5.x.x

#### Path prefix
> [`server.path(relativeTo)`](https://github.com/hapijs/hapi/blob/master/API.md#server.path())

  - **`path.js`** - export `relativeTo` or `function(server, options)` that returns `relativeTo`.
  - **`path/index.js`** - export `relativeTo` or `function(server, options)` that returns `relativeTo`.

#### Provisioning caches
> [`await server.cache.provision(options)`](https://github.com/hapijs/hapi/blob/master/API.md#server.cache.provision())

  - **`caches.js`** - export an array of `options` or `function(server, options)` that returns array of `options`.
  - **`caches/index.js`** - export an array of `options` or `function(server, options)` that returns array of `options`.
  - **`caches/some-cache-name.js`** - export `options` or `function(server, options)` that returns `options`.  The cache's `options.name` will be assigned `'cache-name'` from the filename if a name isn't already specified.

#### Plugin registrations
> [`await server.register(plugins, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#server.register())

  - **`plugins.js`** - export an array of objects `{ plugins, options }` or `function(server, options)` that returns an array of objects `{ plugins, options }`.
  - **`plugins/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`plugins/plugin-name.js`** - export an object or `function(server, options)` that returns an object. If a plugin isn't specified in `plugins` it will be `require()`d using the filename.  Scoped plugins may also be specified using a dot (`.`) as a separator between the scope and the package name, e.g. `plugins/@my-scope.my-package.js` would register the plugin `require('@my-scope/my-package')`.

#### View manager (for [vision](https://github.com/hapijs/vision))
> [`server.views(options)`](https://github.com/hapijs/vision/blob/master/API.md#serverviewsoptions)

  - **`view-manager.js`** - export `options` or `function(server, options)` that returns `options`.
  - **`view-manager/index.js`** - export `options` or `function(server, options)` that returns `options`.

#### Decorations
> [`server.decorate(type, property, method, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#server.decorate())

  - **`decorations.js`** - export an array of objects `{ type, property, method, options }` or `function(server, options)` that returns an array of objects.
  - **`decorations/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`decorations/decoration-name.js`** - export an object or `function(server, options)` that returns an object.  The `property` will be assigned `'decorationName'` camel-cased from the filename if it isn't already specified.
  - **`decorations/[type].decoration-name.js`** - export an object or `function(server, options)` that returns an object. The `type` will additionally be inferred from the filename if it isn't already specified.

#### Exposed properties
> [`server.expose(key, value)`](https://github.com/hapijs/hapi/blob/master/API.md#server.expose())

  - **`expose.js`** - export an array of objects `{ key, value }` or `function(server, options)` that returns an array of objects.
  - **`expose/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`expose/property-name.js`** - export an object or `function(server, options)` that returns an object.  The `key` will be assigned `'propertyName'` camel-cased from the filename if it isn't already specified.

#### Cookies
> [`server.state(name, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#server.state())

  - **`cookies.js`** - export an array of objects `{ name, options }` or `function(server, options)` that returns an array of objects.
  - **`cookies/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`cookies/cookie-name.js`** - export an object  or `function(server, options)` that returns an object.  The `name` will be assigned `'cookie-name'` from the filename if it isn't already specified.

#### Model definitions (for [schwifty](https://github.com/BigRoomStudios/schwifty))
> [`server.schwifty(models)`](https://github.com/BigRoomStudios/schwifty/blob/master/API.md#serverschwiftyconfig)
>
> Note, while `models` will typically be a single Objection model class, you may also specify any configuration accepted by `server.schwifty()`, per the docs linked above.

  - **`models.js`** - export an array of `models` or `function(server, options)` that returns an array of `models`.
  - **`models/index.js`** - export an array of `models` or `function(server, options)` that returns an array of `models`.
  - **`models/model-name.js`** - export `models` or `function(server, options)` that returns an array of `models`.

#### Service definitions (for [schmervice](https://github.com/devinivy/schmervice))
> [`server.registerService(serviceFactory)`](https://github.com/hapipal/schmervice/blob/master/API.md#serverregisterserviceservicefactory)

  - **`services.js`** - export an array of `serviceFactory`s or `function(server, options)` that returns an array of `serviceFactory`s.
  - **`services/index.js`** - export an array of `serviceFactory`s or `function(server, options)` that returns an array of `serviceFactory`s.
  - **`services/service-name.js`** - export `serviceFactory` or `function(server, options)` that returns `serviceFactory`.

#### Globally bound context
> [`server.bind(context)`](https://github.com/hapijs/hapi/blob/master/API.md#server.bind())

  - **`bind.js`** - export `context` or `function(server, options)` that returns `context`.
  - **`bind/index.js`** - export `context` or `function(server, options)` that returns `context`.

#### Dependencies
> [`server.dependency(dependencies, [after])`](https://github.com/hapijs/hapi/blob/master/API.md#server.dependency())

  - **`dependencies.js`** - export an array of objects `{ dependencies, after }` or `function(server, options)` that returns an array of objects.
  - **`dependencies/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`dependencies/plugin-name.js`** - export an object or `function(server, options)` that returns an object. `dependencies` will be derived from the filename if it is not already specified.

#### Server methods
> [`server.method(name, method, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#server.method())

  - **`methods.js`** - export an array of objects `{ name, method, options }` or `function(server, options)` that returns an array of objects.
  - **`methods/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`methods/method-name.js`** - export an object or `function(server, options)` that returns an object.  The `name` will be assigned `'methodName'` camel-cased from the filename if it isn't already specified.

#### Server/request extensions
> [`server.ext(events)`](https://github.com/hapijs/hapi/blob/master/API.md#server.ext())

  - **`extensions.js`** - export an array of `events` or `function(server, options)` that returns an array of `events`.
  - **`extensions/index.js`** - export an array of `events` or `function(server, options)` that returns an array of `events`.
  - **`extensions/[event-type].js`** - export `events` or `function(server, options)` that returns `events`.  The `type` (of each item if there are multiple) will be assigned `[event-type]` camel-cased from the filename if it isn't already specified.  E.g. `onPreHandler`-type events can be placed in `extensions/on-pre-handler.js`.

#### Authentication schemes
> [`server.auth.scheme(name, scheme)`](https://github.com/hapijs/hapi/blob/master/API.md#server.auth.scheme())

  - **`auth/schemes.js`** - export an array of objects `{ name, scheme }` or `function(server, options)` that returns an array of objects.
  - **`auth/schemes/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`auth/schemes/scheme-name.js`** - export an object or `function(server, options)` that returns an object.  The `name` will be assigned `'scheme-name'` from the filename if it isn't already specified.

#### Authentication strategies
> [`server.auth.strategy(name, scheme, [options])`](https://github.com/hapijs/hapi/blob/master/API.md#server.auth.strategy())

  - **`auth/strategies.js`** - export an array of objects `{ name, scheme, options }` or `function(server, options)` that returns an array of objects.
  - **`auth/strategies/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`auth/strategies/strategy-name.js`** - export an object or `function(server, options)` that returns an object.  The `name` will be assigned `'strategy-name'` from the filename if it isn't already specified.

#### Default auth strategy
> [`server.auth.default(options)`](https://github.com/hapijs/hapi/blob/master/API.md#server.auth.default())

  - **`auth/default.js`** - export `options` or `function(server, options)` that returns `options`.
  - **`auth/default/index.js`** - export `options` or `function(server, options)` that returns `options`.

#### Subscriptions (for [nes](https://github.com/hapijs/nes))
> [`server.subscription(path, [options])`](https://github.com/hapijs/nes/blob/master/API.md#serversubscriptionpath-options)

  - **`subscriptions.js`** - export an array of objects `{ path, options }` or `function(server, options)` that returns an array of objects.
  - **`subscriptions/index.js`** - export an array of objects `{ path, options }` or `function(server, options)` that returns an array of objects.
  - **`subscriptions/service-name.js`** - export an object `{ path, options }` or `function(server, options)` that returns an object.

#### Validator (for hapi v19+)
> [`server.validator(validator)`](https://github.com/hapijs/hapi/blob/master/API.md#server.validator())

  - **`validator.js`** - export `validator` or `function(server, options)` that returns `validator`.
  - **`validator/index.js`** - export `validator` or `function(server, options)` that returns `validator`.

#### Routes
> [`server.route(options)`](https://github.com/hapijs/hapi/blob/master/API.md#server.route())

  - **`routes.js`** - export an array of `options` or `function(server, options)` that returns an array of `options`.
  - **`routes/index.js`** - export an array of `options` or `function(server, options)` that returns an array of `options`.
  - **`routes/route-id.js`** - export `options` or `function(server, options)` that returns `options`.  If `options` is a single route config object, the route's `config.id` will be assigned `'route-id'` from the filename if it isn't already specified.  The filename could just as easily represent a group of routes (rather than an id) and the file could export an array of route configs.

### Extras
#### Structure of a [haute](https://github.com/devinivy/haute) manifest item

A haute manifest item describes the mapping of a file/directory's place and contents to a call to the hapi plugin (`server`) API.  In short, the place is mapped to a hapi plugin method, and the file contents are mapped to arguments for that method.  It is an object of the form,
  - `place` - a relative path to the file or directory, typically excluding any file extensions.  E.g. `'auth/strategies'` or `'plugins'`.
  - `method` - the name of the method in the hapi plugin API.  May be a deep method.  E.g. `'auth.strategy'` or `'register'`.  Also may be a function with signature `(server, options, ...values) => void` where `values` are the call's arguments, originating from file contents (see `signature` below).
  - `signature` - (optional) an array of argument names taken by the hapi plugin's method.  When omitted the entire file contents are passed as the sole argument.  An argument may be marked as optional by surrounding it in brackets `[]`.  E.g. `['name', '[options]']` would map file contents of the form `{ name, options }` to a call `server.someMethod(name, options)`, and `{ name }` to a call `server.someMethod(name)`.
  - `list` - (optional) when `true`, indicates to call the hapi plugin method on either,
    - each item in an array exported at `place`, when `place` represents a single file (e.g. `plugins.js`) or a directory with an index file (e.g. `plugins/index.js`) or,
    - each value exported by the files within `place` when `place` is a directory without an index file (e.g. `plugins/vision.js`, `plugins/inert.js`).
  - `useFilename` - (optional) when `list` is `true` and `place` is a directory without an index file, then this option allows one to use the name of the each file within `place` to modify its contents.  Should be a function with signature `function(filename, value, path)` that receives the file's `filename` (without file extension); its contents at `value`; and the file's path relative to `place`.  The function should return a new value to be used as arguments for hapi plugin API call.
  - `recursive` - when `true` and `list` is in effect, this option causes files to be picked-up recursively within `place` rather than just files that live directly under `place`.
  - `include` - may be a function `(filename, path) => Boolean` or a RegExp where `filename` (a filename without extension) and `path` (a file's path relative to `place`) are particular to files under `place`.  When this option is used, a file will only be used as a call when the function returns `true` or the RegExp matches `path`.
  - `exclude` - takes a function or RegExp, identically to `include`.  When this option is used, a file will only be used as a call when the function returns `false` or the RegExp does not match `path`.  This option defaults to exclude any file that lives under a directory named `helpers/`.
  - `meta` - an object containing any meta information not required by haute-couture or haute, primarily for integration with other tools.
