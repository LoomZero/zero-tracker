const Path = require('path');
const FS = require('fs');
const program = require('commander');
const TogglConnector = require('./connector/TogglConnector');
const RedmineConnector = require('./connector/RedmineConnector');
const JSONFile = require('zero-kit/src/util/JSONFile');
const Zero = require('zero-kit');
const Color = require('zero-kit/src/cli/Color');

module.exports = class Tracker {

  /**
   * @param {import('../types').T_TrackerOptions} options
   */
  constructor(options) {
    this.options = options;

    this._commands = null;
    this._config = null;
    this._toggl = null;
    this._redmine = {};

    Zero.setApp('tracker', 'zero-tracker', this);
    Zero.setup();
  }

  /** @returns {JSONFile} */
  get config() {
    if (this._config === null) {
      this._config = new JSONFile(Zero.storage.path('config.json'));
    }
    return this._config;
  }

  /** @returns {Object<string, import('./Command')>} */
  get commands() {
    if (this._commands !== null) return this._commands;
    this._commands = {};
    const commands = FS.readdirSync(Path.join(__dirname, 'commands'));

    for (const command of commands) {
      const subject = require(Path.join(__dirname, 'commands', command));
      this._commands[Path.parse(command).name] = new subject(this, Path.parse(command).name);
    }
    return this._commands;
  }

  /**
   * @param  {...string} args 
   * @returns {string}
   */
  path(...args) {
    return Path.join(this.options.root, ...args);
  }

  /**
   * @returns {TogglConnector}
   */
  async getToggl() {
    if (this._toggl === null) {
      this._toggl = new TogglConnector(this);
      await this._toggl.init();
    }
    return this._toggl;
  }

  /**
   * @returns {RedmineConnector}
   */
  async getRedmine(project = 'fallback') {
    if (!this.config.get('redmine.' + project + '.api')) {
      project = 'fallback';
    }
    if (this._redmine[project] === undefined) {
      this._redmine[project] = new RedmineConnector(this, project);
      await this._redmine[project].init();
    }
    return this._redmine[project];
  }

  async execute() {
    for (const command in this.commands) {
      this.commands[command].doInit(program);
    }

    const argv = process.argv;

    Zero.handler.emit('init', program, argv);

    program.on('command:*', () => {
      program.help();
    });

    await program.parse(argv);
  }

  exit() {
    Zero.handler.emit('exit');
    process.exit(0);
  }

  /**
   * @param {Error} error
   */
  onError(error) {
    console.error('Uncaught Error: ' + error);
    console.log();
    console.log('Auto check config for better debug:')
    try {
      this.commands.config.testConfig();
    } catch (configError) {
      Color.log('error', 'Error by checking the config.');
      console.log(configError);
    } 
    console.log();
    Zero.handler.emit('error', error);
    throw error;
  }

}