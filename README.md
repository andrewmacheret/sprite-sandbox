# sprite-sandbox

[![Build Status](https://travis-ci.org/andrewmacheret/sprite-sandbox.svg?branch=master)](https://travis-ci.org/andrewmacheret/sprite-sandbox) [![License](https://img.shields.io/badge/license-MIT-lightgray.svg)](https://github.com/andrewmacheret/sprite-sandbox/blob/master/LICENSE.md)

Move 2d characters with arrow keys in a sandbox. Uses [Pixi.js](http://www.pixijs.com/) and [jQuery](https://jquery.com/).

See it running at [https://andrewmacheret.com/projects/sprites](https://andrewmacheret.com/projects/sprites).

Prereqs:
* A web server (like [Apache](https://httpd.apache.org/)).

Installation steps:
* `git clone <clone url>`

Test it:
* Open `index.html` in a browser.
 * For testing purposes, if you don't have a web server, running `python -m SimpleHTTPServer` in the project directory and navigating to [http://localhost:8000](http://localhost:8000) should do the trick.
* You should see several sprites in an orange box. Use arrow keys to move a sprite, and click to change which sprite is being controlled.
* To troubleshoot, look for javascript errors in the browser console.

