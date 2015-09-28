/**
 * @license ractive-uhray-events Copyright (c) 2014, Uhray LLC
 * Available via the MIT license.
 * see: http://github.com/uhray for details
 */
define([
  './tap',
  './drag',
  './enter'
],
function(tap, drag, enter) {
  var events = {
        tap: tap,
        drag: drag,
        enter: enter
      },
      k;

  for (k in events) events[k].init(Ractive);

  return function configure(cfg) {
    cfg = cfg || {};

    for (k in events) if (cfg[k]) events[k].configure(cfg[k]);
  }

});
