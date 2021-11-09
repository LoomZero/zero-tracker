const Open = require('open');
const TogglClient = require('toggl-api');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');

module.exports = class TogglConnector {

  /**
   * @param {import('../Tracker')} tracker 
   */
  constructor(tracker) {
    this.tracker = tracker;
    this._api = null;
  }
 
  async init() {
    if (!this.tracker.config.get('toggl.api.apiToken')) {
      Open('https://toggl.com/app/profile');
      
      const key = await this.tracker.input('Please enter Toggl API Key (Can be found on bottom of your Toggl account page): ');

      this.tracker.config
        .set('toggl.api.apiUrl', 'https://api.track.toggl.com')
        .set('toggl.api.apiToken', key)
        .save();
    }
  }

  get api() {
    if (this._api === null) {
      this._api = new TogglClient(this.tracker.config.get('toggl.api'));
    }
    return this._api;
  }

  async getTimeEntries(from, to) {
    from = Moment.unix(Strtotime(from));
    to = Moment.unix(Strtotime(to));

    return new Promise((res, rej) => {
      this.api.getTimeEntries(from.toDate(), to.toDate(), res);
    });
  }

}