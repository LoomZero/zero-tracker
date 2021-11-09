const Path = require('path');
const FS = require('fs');
const program = require('commander');
const TogglConnector = require('./connector/TogglConnector');
const Config = require('./util/Config');
const Readline = require('readline');

/**
 * @typedef {Object} T_TrackerOptions
 * @property {string} root
 */

module.exports = class Tracker {

  /**
   * @param {T_TrackerOptions} options
   */
  constructor(options) {
    this.options = options;

    this._commands = null;
    this._config = null;
    this._toggl = null;
  }

  /** @returns {Config} */
  get config() {
    if (this._config === null) {
      this._config = new Config(this.path('config/config.json'));
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
      this._commands[Path.parse(command).name] = new subject(this);
    }
    return this._commands;
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

  execute() {
    for (const command in this.commands) {
      this.commands[command].doInit(program);
    }

    program.on('command:*', () => {
      program.help();
    });

    program.parse(process.argv);
  }

  exit() {
    process.exit(0);
  }

  /**
   * @param {string} message 
   * @returns {string}
   */
  async input(message) {
    const readline = Readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((res, rej) => {
      readline.question(message, (answer) => {
        res(answer);
      })
    });
  } 

}