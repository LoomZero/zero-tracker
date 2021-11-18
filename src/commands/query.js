const Command = require('../Command');
const Color = require('zero-kit/src/cli/Color');

module.exports = class QueryCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('query <api> <action>')
      .option('--project <project>', 'The project for redmine connection', this.fallback('project', null))
      .description('Remove all tracker configs from the system.');
  }

  async action(api, action) {
    switch (api) {
      case 'redmine':
        return await this.redmine(action);
      default:
        Color.log('section.abort', 'Unknown api {api}', { api });
        break;
    }
  }

  async redmine(action) {
    if (!this.tracker.config.get('redmine.fallback.api.apiKey')) {
      Color.log('error', 'Please create a fallback redmine connection.');
      Color.log('error', 'Use "{command}" to create a connection.', {command: 'tracker redmine add'});
      return;
    }

    const redmine = await this.tracker.getRedmine(this.opts.project);
    /*
    console.log(await redmine.getProjectList());
    const membership = await redmine.getMemberships(438);
    console.log(membership.shift().roles[0].name);
    */

    const issue = await redmine.getIssue(31530);
    console.log(issue);
    try {
      await redmine.updateIssue(issue.id, {
        notes: 'Its a test',
        assigned: 'Paul Sagitza',
      });
    } catch (error) {
      console.log(error);
    }
  }

}