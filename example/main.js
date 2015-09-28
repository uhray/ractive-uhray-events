
require.config({
  baseUrl: '/',
  paths: {
    ractive:       './example/ractive',
    ractiveOrig:   'bower_components/ractive/ractive',
    rv:            'bower_components/rv/rv'
  },
  shim: {
    'lib/main': ['ractive']
  }
});

requirejs(['ractive', 'rv!example/template', 'lib/main'],
function(Ractive, template, events) {
  var ractive = new Ractive({
        el: '#container',
        template: template,
        data: {
          tapCount: 0,
          dragCount: 0,
          dragging: false,
          dragOver: false
        }
      });

  window._events = events;

  // Dragging handling ---------------------------------------------------------

  ractive.on('dragDrop', function() {
    ractive.add('dragCount', 1);
    ractive.set('dragOver', false);
  });

  ractive.observe('dragging', function(d) {
    if (!d) this.set({ pageX: -1000, pageY: -1000 });
  });

  ractive.on('move', function(event) {
    this.set({ pageX: event.pageX, pageY: event.pageY });
  });

  // on-enter ------------------------------------------------------------------

  ractive.on('onEnter', function() {
    alert('Enter');
  });

});
