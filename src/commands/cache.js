const Command = require('../Command');
const Zero = require('zero-kit');
const Color = require('zero-kit/src/cli/Color');

module.exports = class CacheCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('cache [name]')
      .option('--tags <tags...>', 'Enter tags')
      .option('--date <date>', 'Enter a timestamp')
      .option('--days <days>', 'Enter a number of days')
      .option('--years <years>', 'Enter a number of years')
      .description('Cache clear');
  }

  async action(name) {
    const query = {};

    if (name) query.name = name;
    if (this.opts.tags) query.tags = this.opts.tags;
    if (this.opts.date) query.date = parseInt(this.opts.date);
    if (this.opts.days) query.days = parseInt(this.opts.days);
    if (this.opts.years) query.years = parseInt(this.opts.years);

    Zero.storage.clearCache(query);

    Color.log('section.success', 'Successful cleared cache');
  }

}