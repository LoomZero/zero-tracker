#!/usr/bin/env node

const Path = require('path');
const Tracker = require('../src/Tracker');

const options = {
  root: Path.join(__dirname, '..'),
};
const tracker = new Tracker(options);

(async () => {
  try {
    await tracker.execute();
  } catch (e) {
    tracker.onError(e);
  }
})();
