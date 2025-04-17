Handlebars Parser
=================

The official Handlebars.js parser. This package contains the definition for
for the Handlebars language AST, and the parser for parsing into that AST.


Notes
-----

If consumers of this package or their dependants get following error message:

```
require() of ES Module .../.pnpm/@handlebars+parser@file+..+handlebars-parser/node_modules/@handlebars/parser/dist/cjs/index.js not supported.
Instead change the require of index.js in null to a dynamic import() which is available in all CommonJS modules.
```

then the solution is to bump [node >= 20.19](https://nodejs.org/en/blog/release/v20.19.0/).