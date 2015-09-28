({
  mainConfigFile: '../example/main.js',
  baseUrl: '../',
  name: 'bower_components/almond/almond',
  include: ['lib/main'],
  exclude: ['ractive'],
  optimize: 'none',
  stubModules: ['ractive'],
  wrap: {
    startFile: './startFile.frag.js',
    endFile: './endFile.frag.js'
  }
})
