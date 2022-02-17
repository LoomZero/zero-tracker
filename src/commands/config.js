const Command = require('../Command');
const Color = require('zero-kit/src/cli/Color');
const JSONSchema = require('zero-kit/src/util/JSONSchema');

module.exports = class ConfigCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('config <action>')
      .description('edit / show / test config');
  }

  async action(action) {
    switch (action) {
      case 'edit':
        console.log();
        Color.log('info', 'Please use {command} after edit the config file.', {command: 'tracker config test'});
        Color.log('info', 'For config, edit this file: {file}', {file: this.tracker.config.path});
        Color.log('info', 'For actions, edit this file: {file}', {file: this.tracker.configActions.path});
        console.log();
        Color.log('info', 'For more infos see: {url}', {url: 'https://github.com/LoomZero/zero-tracker#4---change-config'});
        console.log();
        break;
      case 'show':
        Color.log('section.success', 'Config:');
        console.log(JSON.stringify(this.tracker.config.data, null, '  '));
        Color.log('section.success', 'Actions:');
        console.log(JSON.stringify(this.tracker.configActions.data, null, '  '));
        break;
      case 'test':
        this.testConfig();
        break;
      default:
        Color.log('error', 'Invalid argument <action>');
        Color.log('error', 'Valid options are: {options}', {options: 'edit, show, test'});
        break;
    }
  }

  testConfig() {
    const configSchema = require(this.tracker.path('schema/config.schema.json'));
    const actionsSchema = require(this.tracker.path('schema/actions.schema.json'));

    if (this.tracker.config.config === null) {
      Color.log('error', 'Error: No config loaded.');
    } else {
      if (this.checkSchema(this.tracker.config.data, configSchema)) {
        Color.log('section.success', 'The config is valid. \u2713');
      } else {
        Color.log('section.abort', 'The config is not valid! \u2718');
      }
    }
  
    if (this.tracker.configActions.config === null) {
      Color.log('error', 'Error: No actions config loaded.');
    } else {
      if (this.checkSchema(this.tracker.configActions.data, actionsSchema)) {
        Color.log('section.success', 'The actions config is valid. \u2713');
      } else {
        Color.log('section.abort', 'The actions config is not valid! \u2718');
      }
    }
  }

  /**
   * @param {object} object 
   * @param {object} schema 
   * @returns {boolean}
   */
  checkSchema(object, schema) {
    const jsonschema = new JSONSchema(schema);
    const results = jsonschema.logResults(object);
    return results.valid;
  }

}