ractive-uhray-events
=======

A library of events for [Ractive](http://www.ractivejs.org/).

  * [Overview](#overview)
  * [Events](#events)
  * [See Example](#see-example)
  * [Contribute](#contribute)

## Overview

Basically this library installs a bunch of Ractive event plugins with configurable options. You can see the different [events](#events) below.

Install Events:
```js
define(['uhray-events'], function(events) {
  // Once the events are included, they are installed automatically
});
```

Configure events:
```js
define(['uhray-events'], function(events) {

  events({
    tap: { /* configuration overrides for tap */ },
    drag: { /* configuration overrides for drag */ }
    // ... and so on for whichever events you wish to override
  })
  
  // NOTE: event configurations are global, so any changes will be seen everywhere
});
```

## Events

* [tap](#tap)
* [drag](#drag)
* [enter](#enter)

### tap

Tap is a copy from [ractive-events-tap](git@github.com:ractivejs/ractive-events-tap.git), but you can change the configurations.

Configurations:

```js
{
  distanceThreshold: 5,  // pixel distance cursor can move
  timeThreshold: 400  // maximum hold time between mousedown and mouseup
}
```

### drag

A few events to listen to drag properties. This is not related to [HTML Drag and Drop](http://www.w3schools.com/html/html5_draganddrop.asp), because that only allows you to drag elements within a container. These drag events allow you to drag any element and drop it anywhere.

Below is an example of the HTML events. See the example file for more information.

```html
<style>
  .noselect {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>

<div class="noselect">
  <h3>Drag:</h3>
  <b on-startdrag="set('dragging', true)"
     on-dragmove="move"
     on-stopdrag="set('dragging', false)">
    dragThis
  </b>
  <br/> <br/>

  {{#if dragging}}
    <div class="dragging"
         style="left:{{pageX}}px;top:{{pageY}}px">
      dragging
    </div>
  {{/if}}

  <div style="width: 200px; margin: 0 auto; height: 200px; border: dashed 2px #000;
             {{#if dragOver}}border-color: red;{{/if}}"
       on-dragover="set('dragOver', true)"
       on-dragleave="set('dragOver', false)"
       on-dragdrop="dragDrop">
    <br/> <br/>
    <b>{{#if dragging}}Drop Here{{else}}Start Dragging{{/if}}</b>
    <br/>
    <br/>
    <b>{{dragCount}} dropped</b>
  </div>

  <br/>
  <hr/>
</div>
```

Configurations:

```js
config = {
  downBuffer: 100  // minimum time with mousedown before it's a 'dragstart' event
}
```
### enter

Very simple. This event on inputs or textareas when the "enter" key is pressed.

Configurations:

```js
config = {
  eventType: 'keypress'  // the event type to listen for. Could be keydown or keyup as well
};
```

## See Example

To see the example page, clone the repo and run:

```
npm install
bower install
gulp example
```

Then visit http://127.0.0.1:8080/example/. 

> You'll need [bower](http://bower.io/) and [gulp](http://gulpjs.com/) installed.

## Contribute

The development code is located in [lib](lib). The example code is in [example](example).

After you develop, ling: `gulp lint`.

Then you can build and push: `gulp build` to build the files to [dist](dist). Make sure to test out that the built files work.
