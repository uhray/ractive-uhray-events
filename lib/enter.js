define(['./tools'], function(tools) {
  var config = {
        eventType: 'keypress'
      };

  // ====================== Handle Config Updating ========================== //

  return {
    init: init,
    configure: updateConfigs
  }

  // ====================== Handle Config Updating ========================== //

  function updateConfigs(cfg) {
    tools.merge(config, cfg);
  }

  // ========================== Create Tap Event ============================ //

  function init(ractive) {
    ractive.events.enter = function(node, fire) {
      node.addEventListener(config.eventType, keypress);

      return {
        teardown: function() {
          node.removeEventListener(config.eventType, keypress);
        }
      }

      function keypress(event) {
        if (event.keyCode == 13) {
          fire({
            node: node,
            name: 'enter',
            target: self,
            original: event
          });
        }
      }
    }
  }

});
