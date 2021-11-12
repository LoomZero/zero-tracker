const Open = require('open');
const Connector = require('../Connector');
const Redmine = require('node-redmine');

module.exports = class RedmineConnector extends Connector {

  /**
   * @param {import('../Tracker')} tracker 
   * @param {string} project
   */
  constructor(tracker, project) {
    super(tracker);
    this.project = project;
    this._api = null;
  }

  /** @returns {Redmine} */
  get api() {
    if (this._api === null) {
      this._api = new Redmine(this.tracker.config.get('redmine.' + this.project + '.hostname'), this.tracker.config.get('redmine.' + this.project + '.api'), this.tracker.config.get('redmine.' + this.project + '.port'));
    }
    return this._api;
  }

  /**
   * @return {string}
   */
  getName() {
    return this.tracker.config.get('redmine.' + this.project + '.name');
  }

  /**
   * @param {number} id 
   * @returns {Promise<import('../../types').T_RedmineIssue>}
   */
  getIssue(id) {
    if (typeof id === 'string') id = Number.parseInt(id);
    return this.promise('get_issue_by_id', id, {}).then(issue => issue.issue);
  }

  /**
   * @param {number} issue 
   * @param {number} hours 
   * @param {number} activity
   * @param {string} comment 
   * @param {import('moment').Moment} when
   * @param {array} customFields 
   * @returns {Promise}
   */
  createTimeEntry(issue, hours, activity, comment = '', when = null, customFields = null) {
    if (typeof issue === 'string') {
      issue = Number.parseInt(issue);
    }
    if (typeof activity === 'string') {
      activity = Number.parseInt(activity);
    }
    const time_entry = {
      issue_id: issue,
      hours: hours,
      activity_id: activity,
      comments: comment,
      spent_on: (when ? when.format('YYYY-MM-DD') : null),
    };

    if (customFields && customFields.length) {
      time_entry.custom_fields = customFields;
    }

    return this.promise('create_time_entry', { time_entry });
  }

}