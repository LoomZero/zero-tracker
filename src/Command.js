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

    try {
      await this.action(...args);
    } catch (e) {
      this.tracker.onError(e);
    }
    this.tracker.exit();
  }

  async action() {}

  error(message) {
    console.log('\x1b[31m' + message + '\x1b[0m');
  }

  isInt(value) {
    return Number.parseInt(value) + '' === value;
  }

}