module.exports = class Connector {

  /**
   * @param {import('../Tracker')} tracker 
   */
  constructor(tracker) {
    this.tracker = tracker;
  }
 
  async init() { }

  get api() { return null; }

  /**
   * @param {string} func 
   * @param  {...any} args 
   * @returns {*}
   */
  promise(func, ...args) {
    return new Promise((res, rej) => {
      this.api[func](...args, (error, response) => {
        error ? rej(error) : res(response);
      });
    });
  }

}