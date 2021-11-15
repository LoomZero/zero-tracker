const Command = require('../Command');
const FS = require('fs');
const Path = require('path');
const OS = require('os');

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
    if (await this.tracker.input('Are you sure to delete all configs regarding the tracker (y/n): ') !== 'y'){
      this.error('Abort');
      return;
    }
    this.doDestroy();
    console.log('Removed all local files from the system.');
  }

  doDestroy() {
    if (FS.existsSync(this.tracker.config.path)) {
      FS.unlinkSync(this.tracker.config.path);
    }
    const dir = Path.join(OS.homedir(), '.zero-tracker');
    if (FS.existsSync(dir)) {
      FS.rmdirSync(dir);
    }
    this.tracker.handler.emit('destroy');
  }

}