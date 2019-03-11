const slsw = require("serverless-webpack");
const webpack = require("webpack");

module.exports = {
  entry: slsw.lib.entries,
  target: "node",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      navigator: {}
    }),
    new webpack.ProvidePlugin({
      fetch:
        "imports-loader?this=>global!exports-loader?global.fetch!isomorphic-fetch"
    })
  ]
};
