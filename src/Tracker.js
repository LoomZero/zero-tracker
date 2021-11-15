const Path = require('path');
const FS = require('fs');
const OS = require('os');
const Handler = require('events');
const program = require('commander');
const TogglConnector = require('./connector/TogglConnector');
const Config = require('./util/Config');
const Readline = require('readline');
const RedmineConnector = require('./connector/RedmineConnector');

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
    this.handler = new Handler();
  }

  /** @returns {Config} */
  get config() {
    if (this._config === null) {
      this.ensureHome();
      this._config = new Config(Path.join(OS.homedir(), '.zero-tracker/config.json'));
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

  ensureHome() {
    if (!FS.existsSync(Path.join(OS.homedir(), '.zero-tracker'))) {
      FS.mkdirSync(Path.join(OS.homedir(), '.zero-tracker'));
      this.handler.emit('ensure');
    }
  }

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

    this.handler.emit('init', program, argv);

    program.on('command:*', () => {
      program.help();
    });

    await program.parse(argv);
  }

  exit() {
    this.handler.emit('exit');
    process.exit(0);
  }

  /**
   * @param {string} message 
   * @param {import('../types').C_InputValidate} validate
   * @returns {string}
   */
  async input(message, validate = null) {
    let valid = false;
    let answer = '';
    do {
      answer = await this.doInput(message);
      if (validate === null) {
        valid = true;
      } else {
        const error = await validate(answer);
        if (typeof error === 'string') {
          console.log('\x1b[31m' + error + '\x1b[0m');
          valid = false;
        } else if (error === false) {
          console.log('\x1b[31mERROR\x1b[0m');
          valid = false;
        } else {
          valid = true;
        }
      }
    } while (!valid);
    return answer;
  } 

  /**
   * @param {string} message 
   * @returns {string}
   */
  doInput(message) {
    const readline = Readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((res, rej) => {
      readline.question('\x1b[32m' + message + '\x1b[36m', (answer) => {
        process.stdout.write('\x1b[0m');
        readline.close();
        res(answer);
      })
    });
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
      this.commands.config.error('Error by checking the config.');
      console.log(configError);
    } 
    console.log();
    this.handler.emit('error', error);
    throw error;
  }

}