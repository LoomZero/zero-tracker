module.exports = class Connector {

  /**
   * @param {import('./Tracker')} tracker 
   */
  constructor(tracker) {
    this.tracker = tracker;

    this._request = null;
    this._response = null;
  }
 
  async init() { }

  get api() { return null; }

  /** @returns {import('../types').T_ConnectorRequest} */
  get request() { return this._request }

  get response() { return this._response }

  /**
   * @param {string} func 
   * @param  {...any} args 
   * @returns {Promise<*>}
   */
  promise(func, ...args) {
    this._request = { func, args };
    this._response = null;
    this.tracker.debug(this.constructor.name + ' call ' + func + ' {context}', {}, args);
    return new Promise((res, rej) => {
      this.api[func](...args, (error, response) => {
        this.tracker.debug(this.constructor.name + ' call ' + func + ' {context} response: {response}', {
          response: response ? JSON.stringify(response).replace(/\\"/g, '"') : '',
        }, args);
        this._response = response;
        error ? rej(error) : res(response);
      });
    });
  }

}