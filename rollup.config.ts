import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import pkg from './package.json';

// can fix this when TypeScript 4.2 is released (currently in beta).
// https://github.com/rollup/plugins/issues/287

const libraryName = 'babylonjs-hook';

// The nexted imports are otherwise not considered external.
// ie: import { ... } from '@babylonjs/core/scene'
const replace = {
  '@babylonjs/core': /@babylonjs\/core.*/
}

const external = Object.keys(pkg.peerDependencies || {})
  .reduce((prev, cur) =>  {
    prev.push(replace[cur] !== undefined ? replace[cur] : cur);
    return prev;
  }, []);
console.log('external:', external.join(','))

export default {
  input: `src/${libraryName}.tsx`,
  output: [
    { 
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: '@babylonjs/*')
  external,
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Compile TypeScript files
    typescript({
      outDir: 'dist'
    }),
    // Allow json resolution
    json(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/plugins/tree/master/packages/node-resolve#usage
    resolve()
  ],
}
