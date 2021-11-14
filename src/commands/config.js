const Command = require('../Command');
const JSONSchemaValidate = require('jsonschema').validate;

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
        console.log('Please use "tracker config test" after edit the config file.');
        console.log('Edit this file: ' + this.tracker.path('config/config.json'));
        break;
      case 'show':
        console.log(JSON.stringify(this.tracker.config.config, null, '  '));
        break;
      case 'test':
        this.testConfig();
        break;
      default:
        this.error('Invalid argument <action>');
        this.error('Valid options are: edit, show, test');
        break;
    }
  }

  testConfig() {
    const schema = require(this.tracker.path('schema/config.schema.json'));

    if (this.tracker.config.config === null) {
      this.error('Error: No config loaded.');
      return;
    }
    if (this.checkSchema(this.tracker.config.config, schema)) {
      console.log();
      console.log('The config is valid.');
    } else {
      console.log();
      this.error('The config is not valid!');
    }
    console.log();
  }

  /**
   * @param {object} object 
   * @param {object} schema 
   * @param {function} onError 
   * @returns {boolean}
   */
  checkSchema(object, schema, onError = null) {
    const result = JSONSchemaValidate(object, schema);
    if (result.errors && result.errors.length) {
      if (typeof onError === 'function') {
        onError(result);
      } else {
        console.log();
        this.error('Errors:');
        for (const error of result.errors) {
          this.error('- "' + error.path.join('.') + '" ' + error.message);
        }
      }
      return false;
    }
    return true;
  }

}