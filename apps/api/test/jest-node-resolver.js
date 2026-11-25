/**
 * Jest resolver for the integration suites: packages are resolved the way Node resolves them for
 * the API at runtime (the `node` and `require` export conditions), then by Jest's own resolver.
 * The Firebase Admin SDK depends on packages whose CommonJS builds are exported for the `node`
 * condition only; without this Jest would load their ES module builds.
 */
/* eslint-disable @typescript-eslint/no-var-requires -- a CommonJS file loaded by Jest */
const path = require('node:path');

module.exports = (request, options) => {
  const bare = !request.startsWith('.') && !path.isAbsolute(request);
  if (bare) {
    try {
      return require.resolve(request, { paths: [options.basedir] });
    } catch {
      // Not a package Node can resolve from here (a Jest module name mapping, for example).
    }
  }
  return options.defaultResolver(request, options);
};
