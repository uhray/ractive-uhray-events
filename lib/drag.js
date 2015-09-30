define(['./tools'], function(tools) {
  var config = {
        downBuffer: 100
      },
      DOWN_BUFFER = 100;

  // ====================== Handle Config Updating ========================== //

  return {
    init: init,
    configure: updateConfigs
  }

  // ====================== Handle Config Updating ========================== //

  function updateConfigs(cfg) {
    tools.merge(config, cfg);
    DOWN_BUFFER = tools.downBuffer;
  }

  // ========================== Create Tap Event ============================ //

  function init(ractive) {
    var events = ractive.events,
        inDrag = false;

    events.startdrag = function(node, fire) {
      var timeout;

      window.addEventListener('mouseup', up);
      node.addEventListener('mousedown', down);

      return {
        teardown: function() {
          window.removeEventListener('mouseup', up);
          node.removeEventListener('mousedown', down);
        }
      }

      function up(event) {
        // Needs to be in timeout so it does not beat other calls
        setTimeout(function() {
          inDrag = false;
          clearTimeout(timeout);
        });
      }

      function down(event) {
        var self = this;

        timeout = setTimeout(function() {
          inDrag = true;

          fire({
            node: node,
            name: 'startdrag',
            target: self,
            original: event
          });

        }, DOWN_BUFFER);
      }
    };

    events.stopdrag = function(node, fire) {
      var inDrag = false,
          timeout;

      window.addEventListener('mouseup', up);
      node.addEventListener('mousedown', down);

      return {
        teardown: function() {
          window.removeEventListener('mouseup', up);
          node.removeEventListener('mousedown', down);
        }
      }

      function up(event) {
        clearTimeout(timeout);
        if (!inDrag) return;

        inDrag = false;

        fire({
          node: node,
          name: 'stopdrag',
          target: this,
          original: event
        });
      }

      function down(event) {
        var self = this;

        timeout = setTimeout(function() {
          inDrag = true;
        }, DOWN_BUFFER)
      }
    };

    events.dragmove = function(node, fire) {
      var inDrag = false,
          timeout;

      window.addEventListener('mouseup', up);
      window.addEventListener('mousemove', move);
      node.addEventListener('mousedown', down);

      return {
        teardown: function() {
          window.removeEventListener('mouseup', up);
          window.removeEventListener('mousemove', up);
          node.removeEventListener('mousedown', down);
        }
      }

      function move(event) {
        if (!inDrag) return;

        fixPageXY(event);

        fire({
          node: node,
          name: 'drag-move',
          target: this,
          original: event,
          pageX: event.pageX,
          pageY: event.pageY
        });
      }

      function up(event) {
        if (!inDrag) return;
        inDrag = false;
        clearTimeout(timeout);
      }

      function down(event) {
        var self = this;

        timeout = setTimeout(function() {
          inDrag = true;
        }, DOWN_BUFFER)
      }
    };

    events.dragover = function(node, fire) {
      var over = false;
      window.addEventListener('mousemove', move);

      return {
        teardown: function() {
          window.removeEventListener('mousemove', move);
        }
      }

      function move(event) {
        if (inDrag && within(node, event)) {
          if (over) return;
          over = true;
          fire({
            node: node,
            name: 'dragover',
            target: this,
            original: event
          });
        } else over = false;
      }
    };

    events.dragleave = function(node, fire) {
      var over = false;

      window.addEventListener('mousemove', move);

      return {
        teardown: function() {
          window.removeEventListener('mousemove', move);
        }
      }

      function move(event) {
        var wi;

        if (!inDrag) return;

        wi = within(node, event);

        if (wi) return over = true;

        if (!wi && over) {
          fire({
            node: node,
            name: 'dragleave',
            target: this,
            original: event
          });
        }

        over = false;
      }
    };

    events.dragdrop = function(node, fire) {
      var over = false;

      window.addEventListener('mouseup', up);
      window.addEventListener('mousemove', move);

      return {
        teardown: function() {
          window.removeEventListener('mouseup', up);
          window.removeEventListener('mousemove', move);
        }
      }

      function move(event) {
        var wi;

        if (!inDrag) return;
        over = within(node, event);
      }

      function up(event) {
        if (!inDrag || !over) return;
        fire({
          node: node,
          name: 'dragdrop',
          target: this,
          original: event
        });
      }
    };

    // FUNCTIONS ===============================================================

    function fixPageXY(event) {
      // If pageX/Y aren't available and clientX/Y are,
      // calculate pageX/Y - logic taken from jQuery.
      // (This is to support old IE)
      if (event.pageX == null && event.clientX != null) {
        eventDoc = (event.target && event.target.ownerDocument) || document;
        doc = eventDoc.documentElement;
        body = eventDoc.body;

        event.pageX = event.clientX +
          (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
          (doc && doc.clientLeft || body && body.clientLeft || 0);
        event.pageY = event.clientY +
          (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
          (doc && doc.clientTop  || body && body.clientTop  || 0);
      };
    }

    function within(node, event) {
      var bound = node.getBoundingClientRect();
      fixPageXY(event);
      return (event.pageX >= bound.left &&
              event.pageX <= (bound.left + bound.width) &&
              event.pageY >= bound.top &&
              event.pageY <= (bound.top + bound.height));
    }
  }

});
