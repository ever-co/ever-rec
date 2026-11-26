/**
 * Jest 27 does not read the `exports` map of a package, so a subpath such as
 * `@radix-ui/primitive/is-development` cannot be found. Node's own resolution does read it:
 * when Jest's resolver gives up on a package path, Node is asked.
 */
module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    const isPackagePath =
      !request.startsWith('.') && !/^([a-zA-Z]:)?[\\/]/.test(request);
    if (!isPackagePath) throw error;

    try {
      return require.resolve(request, { paths: [options.basedir] });
    } catch {
      throw error;
    }
  }
};
