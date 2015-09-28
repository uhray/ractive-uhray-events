(function() {
  define(['ractive'], function(Ractive) {
/**
 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                //Lop off the last part of baseParts, so that . matches the
                //"directory" and not name of the baseName's module. For instance,
                //baseName of "one/two/three", maps to "one/two/three.js", but we
                //want the directory, "one/two" for this normalization.
                name = baseParts.slice(0, baseParts.length - 1).concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("bower_components/almond/almond", function(){});

define('lib/tools',[], function() {
  var tools = {};

  tools.merge = function(a, b) {
    for (var k in b) a[k] = b[k];
    return a;
  };

  return tools;
});

define('lib/tap',['./tools'], function(tools) {
  var config = {
        distanceThreshold: 5,
        timeThreshold: 400
      },
      DISTANCE_THRESHOLD = config.distanceThreshold,
      TIME_THRESHOLD = config.timeThreshold;

  // ====================== Handle Config Updating ========================== //

  return {
    init: init,
    configure: updateConfigs
  }

  // ====================== Handle Config Updating ========================== //

  function updateConfigs(cfg) {
    tools.merge(config, cfg);
    DISTANCE_THRESHOLD = config.distanceThreshold,
    TIME_THRESHOLD = config.timeThreshold;
  }

  // ========================== Create Tap Event ============================ //

  function init(Ractive) {
    // jscs:disable
    // see: https://github.com/ractivejs/ractive-events-tap
    var ractive_events_tap = tap;

    function tap(node, callback) {
      return new ractive_events_tap__TapHandler(node, callback);
    }

    var ractive_events_tap__TapHandler = function ractive_events_tap__TapHandler(node, callback) {
      this.node = node;
      this.callback = callback;

      this.preventMousedownEvents = false;

      this.bind(node);
    };

    ractive_events_tap__TapHandler.prototype = {
      bind: function bind(node) {
        // listen for mouse/pointer events...
        if (window.navigator.pointerEnabled) {
          node.addEventListener("pointerdown", handleMousedown, false);
        } else if (window.navigator.msPointerEnabled) {
          node.addEventListener("MSPointerDown", handleMousedown, false);
        } else {
          node.addEventListener("mousedown", handleMousedown, false);
        }

        // ...and touch events
        node.addEventListener("touchstart", handleTouchstart, false);

        // native buttons, and <input type='button'> elements, should fire a tap event
        // when the space key is pressed
        if (node.tagName === "BUTTON" || node.type === "button") {
          node.addEventListener("focus", handleFocus, false);
        }

        node.__tap_handler__ = this;
      },

      fire: function fire(event, x, y) {
        this.callback({
          node: this.node,
          original: event,
          x: x,
          y: y
        });
      },

      mousedown: function mousedown(event) {
        var _this = this;

        if (this.preventMousedownEvents) {
          return;
        }

        if (event.which !== undefined && event.which !== 1) {
          return;
        }

        var x = event.clientX;
        var y = event.clientY;

        // This will be null for mouse events.
        var pointerId = event.pointerId;

        var handleMouseup = function (event) {
          if (event.pointerId != pointerId) {
            return;
          }

          _this.fire(event, x, y);
          cancel();
        };

        var handleMousemove = function (event) {
          if (event.pointerId != pointerId) {
            return;
          }

          if (Math.abs(event.clientX - x) >= DISTANCE_THRESHOLD || Math.abs(event.clientY - y) >= DISTANCE_THRESHOLD) {
            cancel();
          }
        };

        var cancel = function () {
          _this.node.removeEventListener("MSPointerUp", handleMouseup, false);
          document.removeEventListener("MSPointerMove", handleMousemove, false);
          document.removeEventListener("MSPointerCancel", cancel, false);
          _this.node.removeEventListener("pointerup", handleMouseup, false);
          document.removeEventListener("pointermove", handleMousemove, false);
          document.removeEventListener("pointercancel", cancel, false);
          _this.node.removeEventListener("click", handleMouseup, false);
          document.removeEventListener("mousemove", handleMousemove, false);
        };

        if (window.navigator.pointerEnabled) {
          this.node.addEventListener("pointerup", handleMouseup, false);
          document.addEventListener("pointermove", handleMousemove, false);
          document.addEventListener("pointercancel", cancel, false);
        } else if (window.navigator.msPointerEnabled) {
          this.node.addEventListener("MSPointerUp", handleMouseup, false);
          document.addEventListener("MSPointerMove", handleMousemove, false);
          document.addEventListener("MSPointerCancel", cancel, false);
        } else {
          this.node.addEventListener("click", handleMouseup, false);
          document.addEventListener("mousemove", handleMousemove, false);
        }

        setTimeout(cancel, TIME_THRESHOLD);
      },

      touchdown: function touchdown() {
        var _this = this;

        var touch = event.touches[0];

        var x = touch.clientX;
        var y = touch.clientY;

        var finger = touch.identifier;

        var handleTouchup = function (event) {
          var touch = event.changedTouches[0];

          if (touch.identifier !== finger) {
            cancel();
            return;
          }

          event.preventDefault(); // prevent compatibility mouse event

          // for the benefit of mobile Firefox and old Android browsers, we need this absurd hack.
          _this.preventMousedownEvents = true;
          clearTimeout(_this.preventMousedownTimeout);

          _this.preventMousedownTimeout = setTimeout(function () {
            _this.preventMousedownEvents = false;
          }, 400);

          _this.fire(event, x, y);
          cancel();
        };

        var handleTouchmove = function (event) {
          var touch;

          if (event.touches.length !== 1 || event.touches[0].identifier !== finger) {
            cancel();
          }

          touch = event.touches[0];
          if (Math.abs(touch.clientX - x) >= DISTANCE_THRESHOLD || Math.abs(touch.clientY - y) >= DISTANCE_THRESHOLD) {
            cancel();
          }
        };

        var cancel = function () {
          _this.node.removeEventListener("touchend", handleTouchup, false);
          window.removeEventListener("touchmove", handleTouchmove, false);
          window.removeEventListener("touchcancel", cancel, false);
        };

        this.node.addEventListener("touchend", handleTouchup, false);
        window.addEventListener("touchmove", handleTouchmove, false);
        window.addEventListener("touchcancel", cancel, false);

        setTimeout(cancel, TIME_THRESHOLD);
      },

      teardown: function teardown() {
        var node = this.node;

        node.removeEventListener("pointerdown", handleMousedown, false);
        node.removeEventListener("MSPointerDown", handleMousedown, false);
        node.removeEventListener("mousedown", handleMousedown, false);
        node.removeEventListener("touchstart", handleTouchstart, false);
        node.removeEventListener("focus", handleFocus, false);
      }
    };

    function handleMousedown(event) {
      this.__tap_handler__.mousedown(event);
    }

    function handleTouchstart(event) {
      this.__tap_handler__.touchdown(event);
    }

    function handleFocus() {
      this.addEventListener("keydown", handleKeydown, false);
      this.addEventListener("blur", handleBlur, false);
    }

    function handleBlur() {
      this.removeEventListener("keydown", handleKeydown, false);
      this.removeEventListener("blur", handleBlur, false);
    }

    function handleKeydown(event) {
      if (event.which === 32) {
        // space key
        this.__tap_handler__.fire();
      }
    }

    Ractive.events.tap = ractive_events_tap;
    // jscs:enable
  }

});

define('lib/drag',['./tools'], function(tools) {
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

      function move() {
        var wi;

        if (!inDrag) return;
        over = within(node, event);
      }

      function up() {
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

define('lib/enter',['./tools'], function(tools) {
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

/**
 * @license ractive-uhray-events Copyright (c) 2014, Uhray LLC
 * Available via the MIT license.
 * see: http://github.com/uhray for details
 */
define('lib/main',[
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

    require('lib/main');
  });
}());
