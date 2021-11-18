const Command = require('../Command');
const Zero = require('zero-kit');

module.exports = class SetupCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('setup')
      .description('Make the default settings.');
  }

  async action() {
    console.log('Wellcome to zero-tracker setup.');
    await Zero.setup();
    let installing = false;
    let toggl = !this.tracker.config.get('toggl.api.apiToken');
    let redmine = !this.tracker.config.get('redmine.fallback.api.apiKey');

    if (toggl) {
      await this.tracker.getToggl();
      installing = true;
    }

    if (redmine) {
      this.tracker.commands.redmine.opts.workspace = 'select';
      await this.tracker.commands.redmine.add();
      installing = true;
    }

    if (installing) {
      console.log('Now you are ready to track anything');
      console.log('\uD83D\uDE00\u23F1  Happy tracking  \u23F1 \uD83D\uDE00');
    } else {
      console.log('You have already setuped everything');
      console.log('\uD83D\uDE00\u23F1  Happy tracking  \u23F1 \uD83D\uDE00');
    }
  }

}