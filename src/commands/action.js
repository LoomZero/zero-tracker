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
      .command('action')
      .description('Manage actions.');
  }

  async action() {
    const action = await Input.input('Choose an action: ', Input.optionsSelect({}, ['edit', 'show', 'add']));
    switch (action) {
      case 'add': 
        return this.add();
      case 'show':
        break;
      case 'edit':
        break;
    }
  } 

  async add() {
    const redmine = await this.chooseRedmineConnection();
    const project = await this.chooseProject(redmine);
    const name = await Input.input('Enter a name of the action: ', Input.optionsNotEmpty());
    const key = await Input.input('Enter a key of the action: ', Input.optionsNotEmpty());
    const status = await this.chooseStatus(redmine);
    const member = await this.chooseMember(redmine, project);
    const table = new CLITable({
      redmine: 'Redmine', 
      project: 'Project', 
      name: 'Action', 
      key: 'Action-Key',
      status: 'Status',
      member: 'Member',
    });
    table.add({
      redmine: redmine.getName(), 
      project: project.name, 
      name: name, 
      key: key,
      status: status ? status.name : Color.out('error', '<no change>'),
      member: member ? (member.user ? 'USER: ' + member.user.name : 'GROUP: ' + member.group.name) : Color.out('error', '<no change>'),
    });
    table.log();
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

}