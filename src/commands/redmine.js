const Command = require('../Command');
const Open = require('open');
// const CLITable = require('cli-table');
const CLITable = require('../util/CLITable');

module.exports = class RedmineCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('redmine <action>')
      .option('--workspace [workspace]', 'Enter a workspace id', this.fallback('workspace', 'first'))
      .description('add / show / remove redmine config for project');
  }

  async action(action) {
    switch (action) {
      case 'add':
        return await this.add();
      case 'show':
        return await this.show();
      case 'remove':
        return await this.remove();
      default:
        this.error('Invalid argument <action>');
        this.error('Valid options are: show, add, remove');
        break;
    }
  }

  async show() {
    const projects = this.tracker.config.get('redmine');

    const table = new CLITable({
      name: 'Name',
      id: 'ID (Project)',
      apiKey: 'API Key',
      hostname: 'Hostname',
      port: 'Port',
    });
    
    for (const id in projects) {
      table.add([projects[id].name, id, projects[id].api.apiKey, projects[id].hostname, projects[id].port]);
    }
    table.log();
  }

  async remove() {
    const projects = this.tracker.config.get('redmine');
    const ids = [];

    const table = new CLITable({
      id: 'ID',
      name: 'Name',
    });
    for (const id in projects) {
      table.add([id, projects[id].name]);
      ids.push(id);
    }
    table.log();
    const id = await this.tracker.input('Choose Project ID: ', (answer) => {
      if (!ids.includes(answer)) {
        return 'Invalid project ID';
      }
    });

    this.tracker.config.remove('redmine.' + id);
    this.tracker.config.save();
    console.log('Removed project [' + id + '].');
  }

  async add() {
    let project = null;
    let name = null;
    this.toggl = await this.tracker.getToggl();
    const workspace = await this.getWorkspace();

    if (!this.tracker.config.get('redmine.fallback.api.apiKey')) {
      project = 'fallback';
      name = 'Fallback';
      console.log('You have no default redmine connection please add it first.');
    } else {
      const projects = await this.toggl.getProjects(workspace);
      const table = new CLITable({
        id: 'ID',
        name: 'Name',
      });
      for (const project of projects) {
        table.add([project.id, project.name]);
      }
      table.log();
      await this.tracker.input('Select Project ID: ', (answer) => {
        if (this.isInt(answer)) {
          answer = Number.parseInt(answer);
          const item = projects.find(v => v.id === answer);
          if (item) {
            project = item.id;
            name = item.name;
          } else {
            return 'Invalid project ID.';
          }
        } else {
          return 'Please enter the project ID.';
        }
      });
    }

    if (this.tracker.config.get('redmine.' + project + '.api.apiKey')) {
      console.log('You already have a connection for ' + name);
      const input = await this.tracker.input('Overwrite? (y/n): ');
      if (input !== 'y') {
        return;
      }
    }

    if (project === 'fallback') Open('https://redmine.loom.de/my/account');
    this.tracker.config.set('redmine.' + project + '.name', name);
    this.tracker.config.set('redmine.' + project + '.api.apiKey', await this.tracker.input('[apiKey] Please enter Redmine API Key (Can be found on the right hand side of your Redmine account page): ', (answer) => {
      if (answer.length === 0) return 'Required';
    }));
    this.tracker.config.set('redmine.' + project + '.hostname', await this.tracker.input('[hostname] Please enter the Redmine Hostname (Select "https://redmine.loom.de" for LOOM redmine): ', (answer) => {
      if (answer.length === 0) return 'Required';
    }));
    this.tracker.config.set('redmine.' + project + '.port', await this.tracker.input('[port] Please enter the Redmine Port (Select "443" for LOOM redmine): ', (answer) => {
      if (answer.length === 0) return 'Required';
    }));
    this.tracker.config.save();
  }

  /**
   * @returns {(number|null)}
   */
  async getWorkspace() {
    if (this.isInt(this.opts.workspace)) return Number.parseInt(this.opts.workspace);
    const workspaces = await this.toggl.getWorkspaces();
    switch (this.opts.workspace) {
      case 'select':
        if (workspaces.length > 1 || true) {
          console.log('Workspaces:');
          const ids = workspaces.map((v) => {
            console.log(' - ' + v.id + ' "' + v.name + '"');
            return v.id;
          });
          const id = await this.tracker.input('Select (write the ID): ', (answer) => {
            const id = Number.parseInt(answer);
            if (ids.includes(id)) return true;
            return 'Please select a valid ID.';
          });
          console.log('Select workspace:', id);
          return Number.parseInt(id);
        }
      case 'first':
        return workspaces.shift().id;
      default: 
        this.error('Unknown option for workspace option.');
        return null;   
    }
  }

}