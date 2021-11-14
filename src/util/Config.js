const FS = require('fs');
const Reflection = require('./Reflection');

module.exports = class Config {

  /**
   * @param {string} path 
   */
  constructor(path) {
    this.path = path;
    this.config = null;
  }

  /**
   * @returns {this}
   */
  load() {
    if (FS.existsSync(this.path)) {
      try {
        this.config = JSON.parse(FS.readFileSync(this.path)); 
      } catch (e) {
        console.log('Config "' + this.path + '" is not in valid JSON format.');
        throw e;
      }
    } else {
      this.config = {};
    }
    return this;
  }

  /**
   * @returns {this}
   */
  save() {
    FS.writeFileSync(this.path, JSON.stringify(this.config, null, '  '));
    return this;
  }

  /**
   * @param {string} name 
   * @param {*} fallback 
   */
  get(name, fallback = null) {
    if (this.config === null) this.load();
    return Reflection.getDeep(this.config, name, fallback);
  }

  /**
   * @param {string} name 
   * @param {*} value
   * @returns {this}
   */
  set(name, value) {
    Reflection.setDeep(this.config, name, value);
    return this;
  }

  /**
   * @param {string} name 
   * @returns {this}
   */
  remove(name) {
    Reflection.removeDeepRecursive(this.config, name);
    return this;
  }
  
}