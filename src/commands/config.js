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
        Color.log('info', 'Please use {command} after edit the config file.', {command: 'tracker config test'})
        Color.log('info', 'Edit this file: {file}', {file: this.tracker.config.path})
        console.log();
        Color.log('info', 'For more infos see: {url}', {url: 'https://github.com/LoomZero/zero-tracker#4---change-config'});
        console.log();
        break;
      case 'show':
        console.log(JSON.stringify(this.tracker.config.data, null, '  '));
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
    const schema = require(this.tracker.path('schema/config.schema.json'));

    if (this.tracker.config.config === null) {
      Color.log('error', 'Error: No config loaded.');
      return;
    }
    
    if (this.checkSchema(this.tracker.config.data, schema)) {
      Color.log('section.success', 'The config is valid. \u2713');
    } else {
      Color.log('section.abort', 'The config is not valid! \u2718');
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