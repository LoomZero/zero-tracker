const Path = require('path');
const FS = require('fs');
const program = require('commander');
const TogglConnector = require('./connector/TogglConnector');
const RedmineConnector = require('./connector/RedmineConnector');
const JSONFile = require('zero-kit/src/util/JSONFile');
const Zero = require('zero-kit');
const Color = require('zero-kit/src/cli/Color');
const TrackerError = require('./error/TrackerError');
const Reflection = require('zero-kit/src/util/Reflection');

module.exports = class Tracker {

  /**
   * @param {import('../types').T_TrackerOptions} options
   */
  constructor(options) {
    this.options = options;

    this._commands = null;
    this._config = null;
    this._config_actions = null;
    this._toggl = null;
    this._redmine = {};
    this.isDebug = false;

    Zero.setApp('tracker', 'zero-tracker', this);

    Zero.handler.on('setup', () => {
      this.config.load();
      this.config.save();
      this.configActions.load();
      this.configActions.save();
    });

    Zero.setup();
  }

  /** @returns {JSONFile} */
  get config() {
    if (this._config === null) {
      this._config = new JSONFile(Zero.storage.path('config.json'));
    }
    return this._config;
  }

  /** @returns {JSONFile} */
  get configActions() {
    if (this._config_actions === null) {
      this._config_actions = new JSONFile(Zero.storage.path('actions.json'));
    } 
    return this._config_actions;
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
   * Check if a fallback redmine connections is created
   */
  checkRedmine() {
    if (!this.config.get('redmine.fallback.api.apiKey')) {
      Color.log('error', 'Please create a fallback redmine connection.');
      Color.log('error', 'Use "{command}" to create a connection.', {command: 'tracker redmine add'});
      throw new TrackerError('tracker.redmine.connection.fallback', 'Please create a fallback redmine connection.', {redmines: this.config.get('redmine')});
    }
  }

  /**
   * @returns {RedmineConnector}
   */
  async getRedmine(project = 'fallback') {
    this.checkRedmine();

    const redmines = this.config.get('redmine');

    let redmine = null;
    for (const id in redmines) {
      if (id === project || redmines[id].alias.includes(project)) {
        redmine = id;
        break;
      }
    }

    if (redmine === null) redmine = 'fallback';

    if (this._redmine[redmine] === undefined) {
      this._redmine[redmine] = new RedmineConnector(this, redmine);
      await this._redmine[redmine].init();
    }
    return this._redmine[redmine];
  }

  async execute() {
    const argv = process.argv;

    program
      .option('--debug', 'Set log level to debug.');
    
    if (argv.find(v => v === '--debug') === '--debug') {
      this.isDebug = true;
      Zero.setDebugHandler((event, ...args) => {
        switch (event) {
          case 'cache.clear':
          case 'kit.input':
          case 'exit':
            this.debug('Execute event: {event} {param}', {
              event,
              param: JSON.stringify(args[0]),
            });
            break;
          default:
            this.debug('Execute event: {event} {context}', {
              event,
            }, args);
            break;
        }
      });
    }

    Zero.handler.emit('boot', program, argv);

    for (const command in this.commands) {
      this.commands[command].doInit(program);
    }

    Zero.handler.emit('init', program, argv);

    program.on('command:*', () => {
      program.help();
    });

    await program.parse(argv);
  }

  exit() {
    Zero.handler.emit('exit', {reason: 'tracker.exit'});
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

  debug(message, placeholders = {}, context = {}) {
    if (this.isDebug) {
      placeholders.context = JSON.stringify(Reflection.debugContext(context));
      // placeholders.context = JSON.stringify(placeholders.context);
      console.log(Color.out('debug.title', ' DEBUG '), Color.out('debug', message, placeholders));
    }
  }

}