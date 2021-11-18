const Command = require('../Command');
const Open = require('open');
const Input = require('zero-kit/src/cli/Input');
const Color = require('zero-kit/src/cli/Color');
const CLITable = require('zero-kit/src/cli/CLITable');

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
        Color.log('error', 'Invalid argument <action>');
        Color.log('error', 'Valid options are: {options}', {options: 'show, add, remove'});
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
    const id = await Input.input('Choose Project ID: ', {
      validate: (answer) => {
        if (!ids.includes(answer)) {
          return 'Invalid project ID';
        }
      },
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
      await Input.input('Select Project ID: ', {validate: (answer) => {
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
      }});
    }

    if (this.tracker.config.get('redmine.' + project + '.api.apiKey')) {
      console.log('You already have a connection for ' + name);
      if (!await Input.input('Overwrite? (y/n): ', Input.optionsBoolean())) return;
    }

    if (project === 'fallback') Open('https://redmine.loom.de/my/account');
    this.tracker.config.set('redmine.' + project + '.name', name);
    this.tracker.config.set('redmine.' + project + '.api.apiKey', await Input.input('[apiKey] Please enter Redmine API Key (Can be found on the right hand side of your Redmine account page): ', Input.optionsNotEmpty()));
    this.tracker.config.set('redmine.' + project + '.hostname', await Input.input('[hostname] Please enter the Redmine Hostname (Select "https://redmine.loom.de" for LOOM redmine): ', Input.optionsNotEmpty()));
    this.tracker.config.set('redmine.' + project + '.port', await Input.input('[port] Please enter the Redmine Port (Select "443" for LOOM redmine): ', Input.optionsNotEmpty()));
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
        if (workspaces.length > 1) {
          console.log('Workspaces:');
          const ids = workspaces.map((v) => {
            console.log(' - ' + v.id + ' "' + v.name + '"');
            return v.id;
          });
          const id = await Input.input('Select (write the ID): ', {validate: (answer) => {
            const id = Number.parseInt(answer);
            if (ids.includes(id)) return true;
            return 'Please select a valid ID.';
          }});
          console.log('Select workspace:', id);
          return Number.parseInt(id);
        }
      case 'first':
        return workspaces.shift().id;
      default: 
        Color.log('error', 'Unknown option for workspace option.');
        return null;   
    }
  }

}