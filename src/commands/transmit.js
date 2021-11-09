const { program } = require('commander');
const Command = require('../Command');

module.exports = class TransmitCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('transmit')
      .option('--from <from>', 'Enter a date string for from', '-1 days')
      .option('--to <to>', 'Enter a date string for to', 'now')
      .option('--mode <mode>', 'Enter a mode', 'normal')
      .option('--dry', 'Dry run')
      .usage('--from "-1 weeks" --to "now"')
      .description('transmit trackings from toggl to redmine');
  }

  async action(...args) {
    const toggl = await this.tracker.getToggl();

    console.log(await toggl.getTimeEntries(this.opts.from, this.opts.to));
  }

}