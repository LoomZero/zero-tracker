const Command = require('../Command');
const Zero = require('zero-kit');

module.exports = class DestroyCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('finish')
      .requiredOption('-m, --comment <comment>', 'The comment.')
      .option('--state <state>', 'The target state.', '[config]')
      .option('--to <to>', 'Define the user.', '[config]')
      .description('Finish the current ticket.');
  }

  async action() {
    console.log(this.opts.comment);
    this.toggl = await this.tracker.getToggl();
    const tracking = await this.toggl.getCurrentTimeEntry();
    const redmine = await this.tracker.getRedmine(tracking.pid);

    console.log(this.opts.comment, tracking);
  }

}