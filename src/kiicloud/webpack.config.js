const path = require("path");

module.exports = {

  entry: {
    "kii-servercode": path.join(__dirname, "entry.js"),
  },

  output: {
    path: "./dist",
    filename: "[name].js"
  },

  resolve: {
    extensions: ["", ".js"]
  },

  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel?cacheDirectory', exclude: /node_modules/ },
    ]
  },

  devtool: "source-map",

  debug: true,

};
