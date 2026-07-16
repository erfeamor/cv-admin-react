module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  // Jest transforms ESM to CJS, where import.meta.env (Vite's env mechanism)
  // is illegal syntax; this plugin rewrites it to process.env equivalents.
  plugins: ['babel-plugin-transform-vite-meta-env'],
};
