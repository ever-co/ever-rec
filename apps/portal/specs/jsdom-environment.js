/**
 * The jsdom test environment, without the optional `canvas` package.
 *
 * jsdom loads `canvas` whenever it can resolve it, and fails when its native binary was not built
 * (dependencies installed without install scripts, as CI does). No test draws on a canvas, so the
 * package is hidden from jsdom here.
 */
/* eslint-disable @typescript-eslint/no-var-requires -- a CommonJS file loaded by Jest */
const Module = require('node:module');
const path = require('node:path');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithoutCanvas(request, ...rest) {
  if (request === 'canvas' || request.startsWith('canvas/')) {
    const error = new Error(`Cannot find module '${request}'`);
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }
  return originalResolve.call(this, request, ...rest);
};

// Resolved the way Jest itself resolves the `jsdom` environment (through jest-config).
const from = (name, base) => path.dirname(require.resolve(`${name}/package.json`, base ? { paths: [base] } : undefined));
const jestConfigDir = from('jest-config', from('@jest/core', from('jest')));

module.exports = require(require.resolve('jest-environment-jsdom', { paths: [jestConfigDir] }));
