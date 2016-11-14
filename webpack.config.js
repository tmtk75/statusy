module.exports = {

  target: "electron",

  entry: {
    bundle: "./src/bundle.js",
  },

  output: {
    path: "./dist",
    filename: "[name].js"
  },

  externals: [{
    "kii-sdk": "__kii__",
    "paho": "Paho",
  }],

  resolve: {
    extensions: ["", ".js", ".ts", ".tsx"]
  },

  module: {
    loaders: [
      { test: /\.js$/,   loader: 'babel?cacheDirectory', exclude: /node_modules/ },
      { test: /\.tsx?$/, loader: "ts-loader" },
      { test: /\.styl$/, loader: 'style!css!stylus' },
    ]
  },

  devtool: "source-map",

  debug: true,

};
