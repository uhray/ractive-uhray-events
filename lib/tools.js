define([], function() {
  var tools = {};

  tools.merge = function(a, b) {
    for (var k in b) a[k] = b[k];
    return a;
  };

  return tools;
});
