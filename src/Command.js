module.exports = class Command {

  /**
   * @param {import('./Tracker')} tracker 
   */
  constructor(tracker) {
    this.tracker = tracker;
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

    await this.action(...args);
    this.tracker.exit();
  }

  async action() {}

}