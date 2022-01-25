module.exports = class Connector {

  /**
   * @param {import('./Tracker')} tracker 
   */
  constructor(tracker) {
    this.tracker = tracker;
  }
 
  async init() { }

  get api() { return null; }

  /**
   * @param {string} func 
   * @param  {...any} args 
   * @returns {Promise<*>}
   */
  promise(func, ...args) {
    this.tracker.debug(this.constructor.name + ' call ' + func + ' {context}', {}, args);
    return new Promise((res, rej) => {
      this.api[func](...args, (error, response) => {
        this.tracker.debug(this.constructor.name + ' call ' + func + ' {context} response: {response}', {
          response: JSON.stringify(response).replace(/\\"/g, '"'),
        }, args);
        error ? rej(error) : res(response);
      });
    });
  }

}