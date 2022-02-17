const ZeroError = require('zero-kit/src/error/ZeroError');
const Color = require('zero-kit/src/cli/Color');

module.exports = class TrackerError extends ZeroError {

  log(type = 'error') {
    Color.log(type, this.message, this.context);
  }

}