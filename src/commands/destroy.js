const Command = require('../Command');
const Zero = require('zero-kit');

module.exports = class DestroyCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('destroy')
      .description('Remove all tracker configs from the system.');
  }

  async action() {
    console.log('Wellcome to uninstall manager from zero-tracker.');
    await Zero.uninstall();
  }

}