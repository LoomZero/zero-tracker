const TrackerError = require('./TrackerError');

module.exports = class RedmineError extends TrackerError {

  /**
   * @param {string} ident
   * @param {(string|import('../../types').T_RedmineError)} original 
   * @param {string} message 
   * @param {Object} context 
   */
  constructor(ident, original, message, context = {}) {
    super(ident, message, context);
    this.original = original;
  }

}