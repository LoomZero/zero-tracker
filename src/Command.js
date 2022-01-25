const Zero = require('zero-kit');

module.exports = class Command {

  /**
   * @param {import('./Tracker')} tracker 
   * @param {string} command
   */
  constructor(tracker, command) {
    this.tracker = tracker;
    this.command = command;
    this.opts = {};
  }

  fallback(name, fallback = undefined) {
    return this.tracker.config.get('commands.' + this.command + '.opts.' + name, fallback);
  }

  /**
   * @param {import('commander').Command} program
   */
  doInit(program) {
    this.program = program;
    this.init(program).action(this.doAction.bind(this));
  }

  /**
   * @param {import('commander').Command} program
   * @returns {import('commander').Command}
   */
  init(program) {}

  async doAction(...args) {
    this.instance = args.pop();
    this.opts = args.pop();
    this.tracker.debug('Args: {context}', {}, args);
    this.tracker.debug('Opts: {context}', {}, this.opts);

    try {
      Zero.handler.emit('action', this.command, this, args);
      Zero.handler.emit('action:' + this.command, this, args);
      await this.action(...args);
    } catch (e) {
      this.tracker.onError(e);
    }
    this.tracker.exit();
  }

  async action() {}

  isInt(value) {
    return Number.parseInt(value) + '' === value;
  }

}