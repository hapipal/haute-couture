# API

File-based hapi plugin composer

> **Note**
>
> Haute-couture is intended for use with hapi v19+ and nodejs v12+, in addition to several optional peer hapi plugins noted in package.json (_see v3 for lower support_).

## `HauteCouture`
### `await HauteCouture.compose(server, options, [composeOptions])`

Composes `server` by making calls into hapi from file and directory contents as described in [Files and directories](#files-and-directories).  For example, the contents of each file in `routes/` may be used to make a call to `server.routes()` and define a hapi route.  The same goes for many other directories, and many other methods in the hapi server/plugin interface [starting here](https://hapi.dev/api/#server.auth.default()).  Typically `HauteCouture.compose()` is called as a subroutine of hapi plugin registration, and `options` are plugin registration options:

```js
const HauteCouture = require('@hapipal/haute-couture');

module.exports = {
    name: 'my-hapi-plugin',
    async register(server, options) {

        // Custom plugin code can go here

        await HauteCouture.compose(server, options);
    }
};
```

When `composeOptions` is specified then it may define the following properties:

 - `dirname` - an absolute directory path in which to look for the files and directories described [below](#files-and-directories), as well as those from `amendments`.  It defaults to the directory path of the caller.
 - `amendments` - an object whose keys are directories and whose values are configuration about how to interpret the contents of that directory into calls to hapi.  The keys represent directories relative to `dirname`, and we call these "places."  The values follow the format of a [haute manifest item](#structure-of-a-haute-manifest-item) (except the property `place`, which is defined by the value's key), and we call these "amendments".

 There are many amendments that haute-couture uses to provide its default behavior, as described in [Files and directories](#files-and-directories).  In the case that `amendments` defines an amendment at a place for which haute-couture has a default, the contents of `amendment` will override the default.  If `amendments` contains a key whose value is `false`, that place specified by that key will be ignored by haute-couture.  You may also specify the key [`HauteCouture.default` or `'$default'`](#hautecouturedefault) to define defaults for all items.  The following are amendment settings that can be changed through defaults:

  - `recursive` - this option causes files to be picked-up recursively within their directory rather than just files that live directly under `place`.  Flip this to `false` if you would prefer not to have a nested folder structure, e.g. `routes/users/login.js` versus `routes/users-login.js`.
  - `include` - may be a function `(filename, path) => Boolean` or a RegExp where `filename` (a filename without extension) and `path` (a file's path relative to `place`) are particular to files under `place`.  When this option is used, a file will only be used as a call when the function returns `true` or the RegExp matches `path`.
  - `exclude` - takes a function or RegExp, identically to `include`.  When this option is used, a file will only be used as a call when the function returns `false` or the RegExp does not match `path`.  This option defaults to exclude any file that lives under a directory named `helpers/`.
  - `meta` - an object containing any meta information not required by haute-couture or haute, primarily for integration with other tools.

In addition to these settings and the standard [haute item](#structure-of-a-haute-manifest-item) properties, you may also specify the following on an amendment:

  - `before` - a single or array of `place` values for which the given item should be positioned prior to other items.  This modifies the order of the calls made to hapi on `server`.
  - `after` - a single or array of `place` values for which the given item should be positioned subsequent to other items in the manifest.  This modifies the order of the calls made to hapi on `server`.
  - `example` - an example value for this item (i.e. file contents within `place`), primarily used by the [hpal CLI](https://github.com/hapipal/hpal) to scaffold new files at `place`.

See the amendment example below for illustration, noting that the format of `.hc.js` and the format of `composeOptions.amendments` are identical.

#### Specifying amendments with `.hc.js`

When a call to `HauteCouture.compose(server, options, composeOptions)` specifies no `composeOptions.amendments`, haute-couture will check the relevant directory `composeOptions.dirname` for a file named `.hc.js`.  Any amendments exported by this file are used identically to amendments passed as an argument.  This is a nice way to keep haute-couture-related configuration separate from your plugin code, and also offer a standard way for tools such as the [pal CLI](https://github.com/devinivy/paldo) to cater to your particular usage of haute-couture.

#### Amendment example

This example demonstrates how to use a `.hc.js` file in order to swap-out [schwifty's](https://github.com/hapipal/schwifty) handling of [Objection ORM](http://vincit.github.io/objection.js/) models for a much simplified handling of [Mongoose](https://mongoosejs.com) models.  You can even continue to use [`hpal make`](https://github.com/hapipal/hpal#hpal-make) to scaffold your Mongoose models inside the `models/` directory.

##### `index.js`
```js
'use strict';

const HauteCouture = require('@hapipal/haute-couture');
const Mongoose = require('mongoose');

module.exports = {
    name: 'my-hapi-plugin',
    register: async (server, options) => {

        // When registering this plugin pass something like this as plugin options:
        // { mongoURI: 'mongodb://localhost/test' }

        server.app.connection = Mongoose.createConnection(options.mongoURI);

        await HauteCouture.compose(server, options);
    }
};
```

##### `.hc.js`
```js
'use strict';

module.exports = {
    models: {
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
    }
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

### `HauteCouture.composeWith(composeOptions)`

Returns a function with the signature `async function(server, options)`, identical in meaning to the signature of a [hapi plugin](https://hapi.dev/api/#plugins).  This function behaves identically to [`HauteCouture.compose(server, options, composeOptions)`](#await-hautecouturecomposeserver-options-composeoptions) with the final argument fixed.

```js
module.exports = {
    name: 'my-plugin',
    register: HauteCouture.composeWith({
        amendments: {
            $default: {
                recursive: false
            }
        }
    })
};
```

### `HauteCouture.amendment(place, [patch])`

Returns the default amendment at `place`.  For example, `HauteCouture.amendment('auth/strategies')` will return the default amendment that defines the call to `server.auth.strategy()`.  When `patch` is specified then it will be used to alter the returned amendment.

```js
await HauteCouture.compose(server, options, {
    amendments: {
        routes: HauteCouture.amendment('routes', {
            recursive: false
        })
    }
});
```

### `HauteCouture.amendments([amendments])`
> This is most likely to be used by tooling that is interoperating with haute-couture, and isn't a part of everyday usage.

Returns haute-couture's default amendments with `amendments` overrides applied.  The result is an object whose keys are `place`s and values are amendments as described in documentation for [`HauteCouture.compose()`](#await-hautecouturecomposeserver-options-composeoptions).

### `HauteCouture.manifest([amendments, [dirname]])`
> This is most likely to be used by tooling that is interoperating with haute-couture, and isn't a part of everyday usage.

Returns the hapi [haute](https://github.com/devinivy/haute) manifest, incorporating optional `amendments` to the manifest as described in documentation for [`HauteCouture.compose()`](#await-hautecouturecomposeserver-options-composeoptions).  Haute requires each manifest item have an `item.dirname`, which will be set if `dirname` is specified.

### `HauteCouture.default`

A symbol that may be used as a key to specify amendment defaults anywhere `amendments` are passed.  Note that `'$default'` may also be used as a key for this purpose.  When `HauteCouture.default` and `'$default'` both appear in `amendments`, the value at `HauteCouture.default` is used to determine defaults and the value at `'$default'` is interpreted as a place (i.e. a directory named `$default/`).

```js
await HauteCouture.compose(server, options, {
    amendments: {
        // Do not look recursively into directories anywhere aside from routes/
        [HauteCouture.default]: {
            recursive: false
        },
        routes: HauteCouture.amendment('routes', {
            recursive: true
        })
    }
});
```

### Files and directories
We've worked hard to make haute-couture astute in mapping files and directories to hapi calls defining your server or plugin.  And as seen in the comments of the [usage example](README.md#routespingerjs), it also infers configuration from filenames where applicable.

#### Mapping file contents ⟶ calls to hapi

Here's the intuition for what's happening (it's pretty simple!).  If a file `place/my-file.js` exports `contents`, then haute-couture will make a call on your server `server.place(contents)`.  For example, if `{ method, path, handler }` is exported from `routes/my-route.js`, then haute-couture will define a route for you by calling `server.route({ method, path, handler })`.  The behavior is configurable as described in [`HauteCouture.compose()`](#await-hautecouturecomposeserver-options-composeoptions) using "amendments", but most of the time this is all that's happening.  You will find that haute-couture is a pretty thin adapter between file contents and your hapi server.

#### More on file contents

Files will always export an array of values (representing multiple calls into hapi) or a single value (one call into hapi).  When a hapi method takes more than one argument, a single value consists of an object whose keys are the names of the arguments and whose values are the intended argument values.  The format of the argument values come from the [hapi API](https://hapi.dev/api/) unless otherwise specified.

For example, a file defining a new server method (representing a call to `server.method(name, method)`) would export an object of the format `{ name, method }`.

Lastly, files can always export a function with signature `function(server, options)` or `async function(server, options)` that returns the intended value or array of values.

Here's the complete rundown of how files and directories are mapped to calls on your hapi `server`.  The order here reflects the order in which the calls would be made.

> **Note**
>
> You'll see that this library can be used in conjunction with several hapi plugins.  Here are those plugins and their supported versions.
>  - schwifty - v6
>  - schmervice - v2
>  - nes - v11 and v12
>  - vision - v5 and v6

#### Path prefix
> [`server.path(relativeTo)`](https://hapi.dev/api/#server.path())

  - **`path.js`** - export `relativeTo` or `function(server, options)` that returns `relativeTo`.
  - **`path/index.js`** - export `relativeTo` or `function(server, options)` that returns `relativeTo`.

#### Provisioning caches
> [`await server.cache.provision(options)`](https://hapi.dev/api/#server.cache.provision())

  - **`caches.js`** - export an array of `options` or `function(server, options)` that returns array of `options`.
  - **`caches/index.js`** - export an array of `options` or `function(server, options)` that returns array of `options`.
  - **`caches/some-cache-name.js`** - export `options` or `function(server, options)` that returns `options`.  The cache's `options.name` will be assigned `'cache-name'` from the filename if a name isn't already specified.

#### Plugin registrations
> [`await server.register(plugins)`](https://hapi.dev/api/#server.register())

  - **`plugins.js`** - export an array of `plugins` or `function(server, options)` that returns an array of `plugins`.  Note that `plugins` typically takes the form `{ plugin, options, once, routes }`.
  - **`plugins/index.js`** - export an array of `plugins` or `function(server, options)` that returns an array of `plugins`.
  - **`plugins/plugin-name.js`** - export `plugins` or `function(server, options)` that returns `plugins`. If a plugin isn't specified in `plugins` it will be `require()`d using the filename.  Scoped plugins may also be specified using a dot (`.`) as a separator between the scope and the package name, e.g. `plugins/@my-scope.my-package.js` would register the plugin `require('@my-scope/my-package')`.

#### View manager (for [vision](https://github.com/hapijs/vision))
> [`server.views(options)`](https://hapi.dev/module/vision/api/#serverviewsoptions)

  - **`view-manager.js`** - export `options` or `function(server, options)` that returns `options`.
  - **`view-manager/index.js`** - export `options` or `function(server, options)` that returns `options`.

#### Decorations
> [`server.decorate(type, property, method, [options])`](https://hapi.dev/api/#server.decorate())

  - **`decorations.js`** - export an array of objects `{ type, property, method, options }` or `function(server, options)` that returns an array of objects.
  - **`decorations/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`decorations/decoration-name.js`** - export an object or `function(server, options)` that returns an object.  The `property` will be assigned `'decorationName'` camel-cased from the filename if it isn't already specified.
  - **`decorations/[type].decoration-name.js`** - export an object or `function(server, options)` that returns an object. The `type` will additionally be inferred from the filename if it isn't already specified.

#### Exposed properties
> [`server.expose(key, value)`](https://hapi.dev/api/#server.expose())

  - **`expose.js`** - export an array of objects `{ key, value }` or `function(server, options)` that returns an array of objects.
  - **`expose/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`expose/property-name.js`** - export an object or `function(server, options)` that returns an object.  The `key` will be assigned `'propertyName'` camel-cased from the filename if it isn't already specified.

#### Cookies
> [`server.state(name, [options])`](https://hapi.dev/api/#server.state())

  - **`cookies.js`** - export an array of objects `{ name, options }` or `function(server, options)` that returns an array of objects.
  - **`cookies/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`cookies/cookie-name.js`** - export an object  or `function(server, options)` that returns an object.  The `name` will be assigned `'cookie-name'` from the filename if it isn't already specified.

#### Model definitions (for [schwifty](https://github.com/BigRoomStudios/schwifty))
> [`server.registerModel(models)`](https://hapipal.com/docs/schwifty#serverregistermodelmodels)

  - **`models.js`** - export an array of `models` or `function(server, options)` that returns an array of `models`.
  - **`models/index.js`** - export an array of `models` or `function(server, options)` that returns an array of `models`.
  - **`models/model-name.js`** - export `models` or `function(server, options)` that returns `models`.

#### Service definitions (for [schmervice](https://github.com/devinivy/schmervice))
> [`server.registerService(serviceFactory)`](https://hapipal.com/docs/schmervice#serverregisterserviceservicefactory)

  - **`services.js`** - export an array of `serviceFactory`s or `function(server, options)` that returns an array of `serviceFactory`s.
  - **`services/index.js`** - export an array of `serviceFactory`s or `function(server, options)` that returns an array of `serviceFactory`s.
  - **`services/service-name.js`** - export `serviceFactory` or `function(server, options)` that returns `serviceFactory`.

#### Globally bound context
> [`server.bind(context)`](https://hapi.dev/api/#server.bind())

  - **`bind.js`** - export `context` or `function(server, options)` that returns `context`.
  - **`bind/index.js`** - export `context` or `function(server, options)` that returns `context`.

#### Dependencies
> [`server.dependency(dependencies, [after])`](https://hapi.dev/api/#server.dependency())

  - **`dependencies.js`** - export an array of objects `{ dependencies, after }` or `function(server, options)` that returns an array of objects.
  - **`dependencies/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`dependencies/plugin-name.js`** - export an object or `function(server, options)` that returns an object. `dependencies` will be derived from the filename if it is not already specified.

#### Server methods
> [`server.method(name, method, [options])`](https://hapi.dev/api/#server.method())

  - **`methods.js`** - export an array of objects `{ name, method, options }` or `function(server, options)` that returns an array of objects.
  - **`methods/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`methods/method-name.js`** - export an object or `function(server, options)` that returns an object.  The `name` will be assigned `'methodName'` camel-cased from the filename if it isn't already specified.

#### Server/request extensions
> [`server.ext(events)`](https://hapi.dev/api/#server.ext())

  - **`extensions.js`** - export an array of `events` or `function(server, options)` that returns an array of `events`.
  - **`extensions/index.js`** - export an array of `events` or `function(server, options)` that returns an array of `events`.
  - **`extensions/[event-type].js`** - export `events` or `function(server, options)` that returns `events`.  The `type` (of each item if there are multiple) will be assigned `[event-type]` camel-cased from the filename if it isn't already specified.  E.g. `onPreHandler`-type events can be placed in `extensions/on-pre-handler.js`.

#### Authentication schemes
> [`server.auth.scheme(name, scheme)`](https://hapi.dev/api/#server.auth.scheme())

  - **`auth/schemes.js`** - export an array of objects `{ name, scheme }` or `function(server, options)` that returns an array of objects.
  - **`auth/schemes/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`auth/schemes/scheme-name.js`** - export an object or `function(server, options)` that returns an object.  The `name` will be assigned `'scheme-name'` from the filename if it isn't already specified.

#### Authentication strategies
> [`server.auth.strategy(name, scheme, [options])`](https://hapi.dev/api/#server.auth.strategy())

  - **`auth/strategies.js`** - export an array of objects `{ name, scheme, options }` or `function(server, options)` that returns an array of objects.
  - **`auth/strategies/index.js`** - export an array of objects or `function(server, options)` that returns an array of objects.
  - **`auth/strategies/strategy-name.js`** - export an object or `function(server, options)` that returns an object.  The `name` will be assigned `'strategy-name'` from the filename if it isn't already specified.

#### Default auth strategy
> [`server.auth.default(options)`](https://hapi.dev/api/#server.auth.default())

  - **`auth/default.js`** - export `options` or `function(server, options)` that returns `options`.
  - **`auth/default/index.js`** - export `options` or `function(server, options)` that returns `options`.

#### Subscriptions (for [nes](https://github.com/hapijs/nes))
> [`server.subscription(path, [options])`](https://hapi.dev/module/nes/api/#serversubscriptionpath-options)

  - **`subscriptions.js`** - export an array of objects `{ path, options }` or `function(server, options)` that returns an array of objects.
  - **`subscriptions/index.js`** - export an array of objects `{ path, options }` or `function(server, options)` that returns an array of objects.
  - **`subscriptions/service-name.js`** - export an object `{ path, options }` or `function(server, options)` that returns an object.

#### Validator (for hapi v19+)
> [`server.validator(validator)`](https://hapi.dev/api/#server.validator())

  - **`validator.js`** - export `validator` or `function(server, options)` that returns `validator`.
  - **`validator/index.js`** - export `validator` or `function(server, options)` that returns `validator`.

#### Routes
> [`server.route(route)`](https://hapi.dev/api/#server.route())

  - **`routes.js`** - export an array of `route` or `function(server, options)` that returns an array of `route`.
  - **`routes/index.js`** - export an array of `route` or `function(server, options)` that returns an array of `route`.
  - **`routes/route-id.js`** - export `route` or `function(server, options)` that returns `route`.  If `route` is a single route config object, the route's `config.id` will be assigned `'route-id'` from the filename if it isn't already specified.  The filename could just as easily represent a group of routes (rather than an id) and the file could export an array of route configs.

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
