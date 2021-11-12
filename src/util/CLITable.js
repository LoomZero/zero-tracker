const Table = require('cli-table');

module.exports = class CLITable {

  /**
   * @param {Object<string, string>} header 
   */
  constructor(header) {
    this.header = header;

    const head = [];
    for (const id in this.header) {
      head.push(this.header[id]);
    }

    this.table = new Table({
      head: head,
    });
  }

  /**
   * @param  {...Object<string, string>} items 
   * @returns {this}
   */
  add(...items) {
    for (const item of items) {
      if (Array.isArray(item)) {
        this.table.push(item);
      } else {
        const value = [];
        for (const id in this.header) {
          value.push(item[id] || '');
        }
        this.table.push(value);
      }
    }
    return this;
  }

  /**
   * @returns {this}
   */
  log() {
    console.log(this.table.toString());
    return this;
  }

}