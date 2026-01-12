import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['./extension.js'],
  bundle: true,
  minify: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/extension.js',
  external: ['vscode'],
}).catch(() => process.exit(1));