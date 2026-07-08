# Troubleshooting

## Required Node Version for V2.2.0

Consumers using V2.2.0 of this package or their dependants may get following error message:

```
require() of ES Module .../.pnpm/@handlebars+parser@file+..+handlebars-parser/node_modules/@handlebars/parser/dist/cjs/index.js not supported.
Instead change the require of index.js in null to a dynamic import() which is available in all CommonJS modules.
```

The solution is to bump [node >= 20.19](https://nodejs.org/en/blog/release/v20.19.0/).

### Notes

- [Issue Opened](https://github.com/handlebars-lang/handlebars-parser/issues/20)
- [Initial Fix PR](https://github.com/handlebars-lang/handlebars-parser/pull/22) *Unmerged as of Jul 8, 2026*
