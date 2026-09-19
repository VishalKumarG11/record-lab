module.exports = [
  {
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: [
          '@babel/preset-env',
          ['@babel/preset-react', { runtime: 'automatic', development: false }],
          '@babel/preset-typescript',
        ],
      },
    },
  },
  {
    test: /\.svg$/,
    type: 'asset/resource',
  },
  {
    test: /\.ico$/,
    type: 'asset/resource',
  },
  {
    test: /\.png$/,
    type: 'asset/resource',
  },
];