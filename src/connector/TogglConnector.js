const Open = require('open');
const TogglClient = require('toggl-api');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');
const Connector = require('../Connector');

module.exports = class TogglConnector extends Connector {

  /**
   * @param {import('../Tracker')} tracker 
   */
  constructor(tracker) {
    super(tracker);
    this._api = null;
  }
 
  async init() {
    if (!this.tracker.config.get('toggl.api.apiToken')) {
      Open('https://toggl.com/app/profile');

      const key = await this.tracker.input('Please enter Toggl API Key (Can be found on bottom of your Toggl account page): ', (answer) => {
        if (answer.length === 0) return 'Required';
      });

      this.tracker.config
        .set('toggl.api.apiToken', key)
        .save();
    }

    if (!this.tracker.config.get('toggl.api.apiUrl')) {
      this.tracker.config
        .set('toggl.api.apiUrl', 'https://api.track.toggl.com')
        .save();
    }
  }

  /** @returns {TogglClient} */
  get api() {
    if (this._api === null) {
      this._api = new TogglClient(this.tracker.config.get('toggl.api'));
    }
    return this._api;
  }

  /**
   * @param {string} from 
   * @param {string} to 
   * @returns {Promise<import('../../types').T_TogglTracking[]>}
   */
  getTimeEntries(from, to) {
    from = Moment.unix(Strtotime(from));
    to = Moment.unix(Strtotime(to));

    return this.promise('getTimeEntries', from.toDate(), to.toDate());
  }

  /**
   * @returns {Promise<import('../../types').T_TogglWorkspace[]>}
   */
  getWorkspaces() {
    return this.promise('getWorkspaces');
  }

  /**
   * @param {number} workspace 
   * @returns {Promise<import('../../types').T_TogglTag[]>}
   */
  getWorkspaceTags(workspace) {
    return this.promise('getWorkspaceTags', workspace);
  }

  /**
   * @param {number} workspace 
   * @param {string} tag 
   * @returns {Promise<import('../../types').T_TogglTag>}
   */
  createWorkspaceTag(workspace, tag) {
    return this.promise('createTag', tag, workspace);
  }

  /**
   * @param {number} workspace 
   * @returns {Promise<import('../../types').T_TogglProject[]>}
   */
  getProjects(workspace) {
    return this.promise('getWorkspaceProjects', workspace);
  }

  /**
   * @param {number[]} ids 
   * @param {string[]} tags
   * @returns {Promise<import('../../types').T_TogglTracking>}
   */
  addTag(ids, tags) {
    return this.promise('updateTimeEntriesTags', ids, tags, 'add');
  }

  /**
   * @param {number} id 
   * @param {import('../../types').T_TogglTracking} data 
   * @returns {Promise<import('../../types').T_TogglTracking>}
   */
  updateTimeEntry(id, data) {
    return this.promise('updateTimeEntry', id, data);
  }

}