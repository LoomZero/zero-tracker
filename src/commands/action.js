const Command = require('../Command');
const Color = require('zero-kit/src/cli/Color');
const Input = require('zero-kit/src/cli/Input');
const CLITable = require('zero-kit/src/cli/CLITable');

module.exports = class QueryCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('action [action] [issue]')
      .option('-c, --comment <comment>', 'Overwrites the comment', this.fallback('comment', null))
      .option('-a, --addcomment <comment>', 'Append a comment to configurated comment.', this.fallback('addcomment', null))
      .option('--redmine <redmine>', 'The redmine connection default fallback', this.fallback('redmine', 'fallback'))
      .description('Manage actions.');
  }

  async action(action = null, issue = null) {
    if (action === null) {
      action = await Input.input('Choose an action: ', Input.optionsSelect({}, ['edit', 'show', 'add']))
    }
    switch (action) {
      case 'add': 
        return this.add();
      case 'show':
        console.log(this.tracker.config.get('actions'));
        break;
      case 'edit':
        break;
      default: 
        if (issue === null) {
          Color.log('section.abort', 'Invalid argument action {action} or issue {issue}', {action, issue});
          break;
        }
        return await this.executeAction(action, issue);
    }
  } 

  async add() {
    this.tracker.checkRedmine();
    const redmine = await this.chooseRedmineConnection();
    const project = await this.chooseProject(redmine);
    const name = await Input.input('Enter a name of the action: ', Input.optionsNotEmpty());
    const key = await Input.input('Enter a key of the action: ', Input.optionsNotEmpty());
    const status = await this.chooseStatus(redmine);
    const assigned = await this.chooseMember(redmine, project);
    const notes = await Input.input('Comment (leave empty to not use comment): ');
    const table = new CLITable({
      redmine: 'Redmine', 
      project: 'Project', 
      name: 'Action', 
      key: 'Key',
      status: 'Status',
      assigned: 'Member',
    });
    table.add({
      redmine: redmine.getName(), 
      project: project.name, 
      name: name, 
      key: key,
      status: status ? status.name : Color.out('error', '<no change>'),
      assigned: assigned ? (assigned.user ? 'USER: ' + assigned.user.name : 'GROUP: ' + assigned.group.name) : Color.out('error', '<no change>'),
    });
    table.log();
    Color.log('info', 'Example: {command}', {command: key + ' #12345 - Example Comment'});
    const example = new CLITable({
      issue: 'Issue',
      comment: 'Comment',
      action: 'Action',
      execution: 'Execution',
    });
    const execution = [];
    if (status) {
      execution.push(Color.out('info', 'Change status to {status}', {status: status.name + ' (' + status.id + ')'}))
    } 
    if (assigned) {
      execution.push(Color.out('info', 'Change assignee to {user}', {user: (assigned.user ? 'USER: ' + assigned.user.name + ' (' + assigned.user.id + ')' : 'GROUP: ' + assigned.group.name + ' (' + assigned.group.id + ')')}));
    }
    if (notes) {
      execution.push(Color.out('info', 'Comment with: {notes}', {notes}));
    }
    example.add({
      issue: '12345',
      comment: 'Example Comment',
      action: key,
      execution: execution.join('; '),
    });
    example.log();
    if (!await Input.input('Is this action ok? (y/n): ', Input.optionsBoolean())) {
      Color.log('section.abort', 'Abort');
      return;
    }
    this.tracker.config.set('actions.' + key + '.' + redmine.project, {redmine: redmine.project, project: project.id, key, name, status: status ? status.id : null, assigned: assigned ? (assigned.user ? assigned.user.name : assigned.group.name) : null, notes: (notes ? notes : null)}).save();
    Color.log('section.success', 'Added action');
  }

  /**
   * @returns {import('../connector/RedmineConnector')}
   */
  async chooseRedmineConnection() {
    const table = new CLITable({id: 'ID', name: 'Name', hostname: 'Host', port: 'Port'});
    const data = this.tracker.config.get('redmine');
    const options = [];
    for (const id in data) {
      data[id].id = id;
      table.add(data[id]);
      options.push(id);
    }
    table.log();
    if (options.length === 1) {
      Color.log('info', 'Select redmine ID {name} as only redmine connection', {name: data[options[0]].name});
      return await this.tracker.getRedmine(options[0]);
    }
    return await this.tracker.getRedmine(await Input.input('Choose redmine ID: ', Input.optionsSelect({}, options)));
  }

  /**
   * @param {import('../connector/RedmineConnector')} redmine
   * @returns {import('../../types').T_RedmineProject}
   */
   async chooseProject(redmine) {
    const projects = await redmine.listProjects();
    const table = new CLITable({id: 'ID', name: 'Name'});
    for (const project of projects) {
      table.add({...project, id: (project.parent ? ' - ' + project.id : project.id)});
    }
    table.log();
    const id = await Input.input('Choose project root ID: ', Input.optionsSelect({}, projects.map(v => v.id)));
    return projects.find(v => v.id + '' === id);
  }

  /**
   * @param {import('../connector/RedmineConnector')} redmine
   * @returns {(import('../../types').T_RedmineStatus|null)}
   */
  async chooseStatus(redmine) {
    const status = await redmine.listStatus();
    const table = new CLITable({id: 'ID', name: 'Name'});
    for (const item of status) {
      table.add(item);
    }
    table.log();
    const id = await Input.input('Choose status ID (Leave empty to not use status): ', Input.optionsSelect({}, status.map(v => v.id).concat([''])));
    return (id === '' ? null : status.find(v => v.id + '' === id))
  }

  /**
   * @param {import('../connector/RedmineConnector')} redmine
   * @param {import('../../types').T_RedmineProject} project
   * @returns {(import('../../types').T_RedmineMembership|null)}
   */
  async chooseMember(redmine, project) {
    const members = await redmine.getMemberships(project.id);
    const table = new CLITable({id: 'ID', name: 'Name'});
    for (const member of members) {
      table.add({id: member.id, name: (member.user ? 'USER: ' + member.user.name : 'GROUP: ' + member.group.name)});
    }
    table.log();
    const id = await Input.input('Choose member ID (Leave empty to not use member): ', Input.optionsSelect({}, members.map(v => v.id).concat([''])));
    return (id === '' ? null : members.find(v => v.id + '' === id));
  }

  /**
   * @param {string} action 
   * @param {(number|string|import('../../types').T_RedmineIssue)} issue 
   * @param {string} redmine
   * @param {Object<string, string>} comment
   */
  async executeAction(action, issue, redmine = 'fallback', comment = null) {
    const connection = await this.tracker.getRedmine(redmine);
    if (typeof issue === 'string') {
      issue = Number.parseInt(issue);
    } 
    if (typeof issue === 'number') {
      issue = await connection.getIssue(issue);
    }
    const execution = this.createExecution(action, redmine);
    await connection.updateIssue(issue.id, execution.execute);
  }

  /**
   * @param {string} action 
   * @param {(string|number)} project 
   */
  createExecution(action, project) {
    const definition = this.tracker.config.get('actions.' + action + '.' + project);
    const execute = {};
    if (definition.status) execute.status = definition.status;
    if (definition.assigned) execute.assigned = definition.assigned;
    if (definition.notes) execute.notes = definition.notes;

    return {
      definition,
      execute,
    };
  }

  getHumanAction(execution) {
    const data = [];
    if (execution.status) {
      execution.push(Color.out('info', 'Change status to {status}', {status: execution.status.name + ' (' + execution.status.id + ')'}))
    } 
    if (execution.assigned) {
      execution.push(Color.out('info', 'Change assignee to {user}', {user: (execution.assigned.user ? 'USER: ' + execution.assigned.user.name + ' (' + execution.assigned.user.id + ')' : 'GROUP: ' + execution.assigned.group.name + ' (' + execution.assigned.group.id + ')')}));
    }
    if (execution.notes) {
      execution.push(Color.out('info', 'Comment with: {notes}', {notes: execution.notes}));
    }
    return execution.join('; ');
  }

}