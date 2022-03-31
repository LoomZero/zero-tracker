const Connector = require('../Connector');
const Redmine = require('node-redmine');
const RedmineError = require('../error/RedmineError');
const Zero = require('zero-kit');

module.exports = class RedmineConnector extends Connector {

  /**
   * @param {import('../Tracker')} tracker 
   * @param {string} project
   */
  constructor(tracker, project) {
    super(tracker);
    this.project = project;
    this._api = null;
    this._cache = {};
  }

  /** @returns {Redmine} */
  get api() {
    if (this._api === null) {
      this._api = new Redmine(this.tracker.config.get('redmine.' + this.project + '.hostname'), this.tracker.config.get('redmine.' + this.project + '.api'), this.tracker.config.get('redmine.' + this.project + '.port'));
    }
    return this._api;
  }

  /** @returns {import('../../types').T_RedmineConnectorResponse} */
  get response() { return this._response }

  /**
   * @return {string}
   */
  getName() {
    return this.tracker.config.get('redmine.' + this.project + '.name');
  }

  /**
   * @param {string} error 
   * @returns {import('../../types').T_RedmineError}
   */
  getError(error) { 
    if (typeof error === 'string') {
      return JSON.parse(error);
    }
    return error;
  }

  /**
   * @param {string} items 
   * @param {string} func 
   * @param  {...any} args 
   * @returns {*}
   */
  async promiseAll(items, func, ...args) {
    /** @type {import('../../types').T_RedminePagingOptions} */
    const options = args[args.length - 1];
    const offset = options.offset || 0;
    let values = [];
    let response = null;
    do {
      options.offset = offset + values.length;
      response = await this.promise(func, ...args);
      values = values.concat(response[items]);
    } while (values.length < (options.limit ?? response.total_count) && values.length + offset < response.total_count);
    return values;
  }

  /**
   * @param {number} id 
   * @returns {Promise<import('../../types').T_RedmineIssue>}
   */
  getIssue(id, options = {}) {
    if (typeof id === 'string') id = Number.parseInt(id);
    return this.promise('get_issue_by_id', id, options).then(issue => issue.issue).catch(err => {
      const error = this.getError(err);
      switch (error.ErrorCode) {
        case 404: 
          throw new RedmineError('tracker.redmine.notfound', error, 'Issue {id} not found.', {id});
        default:
          throw new RedmineError('tracker.redmine.unknown', error, 'Unknown Error: ' + error.Message, {id});
      }
    });
  }

  /**
   * @returns {Promise<import('../../types').T_RedmineStatus[]>}
   */
  listStatus() {
    return this.promise('issue_statuses').then(data => data.issue_statuses);
  }

  /**
   * @param {number} id 
   * @param {import('../../types').T_RedmineUpdateIssue} issue
   */
  async updateIssue(id, issue) {
    if (!issue.status_id && issue.status) {
      if (typeof issue.status === 'number') {
        issue.status_id = issue.status;
      } else if (typeof issue.status === 'string') {
        issue.status_id = (await this.listStatus()).find(v => v.name === issue.status).id;
      } else {
        issue.status_id = issue.status.id;
      }
    }
    if (!issue.assigned_to_id && issue.assigned) {
      if (typeof issue.assigned === 'number') {
        issue.assigned_to_id = issue.assigned;
      } else if (typeof issue.assigned === 'string') {
        const loadIssue = await this.getIssue(id);
        issue.assigned_to_id = (await this.getMemberships(loadIssue.project.id)).find(v => v.user && v.user.name === issue.assigned || v.group && v.group.name === issue.assigned).user.id;
      } else {
        issue.assigned_to_id = issue.assigned.id;
      }
    }

    if (issue.assigned) delete issue.assigned;
    if (issue.status) delete issue.status;
    return await this.promise('update_issue', id, { issue });
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

  /**
   * @returns {Promise<import('../../types').T_RedmineProject[]>}
   */
  listProjects() {
    return Zero.storage.cache('redmine_listprojects', ['redmine.response.listProjects'], async () => {
      return await this.promiseAll('projects', 'projects', {});
    }, {days: 5}).get();
  }

  async getProjectTree() {
    if (this._cache['projects::tree'] !== undefined) return this._cache['projects::tree'];
    this._cache['projects::tree'] = [];
    const treed = {};
    const projects = await this.listProjects();
    const treeBuilder = (project) => {
      if (treed[project.id] !== undefined) return;
      if (project.parent) {
        if (!treed[project.parent.id]) {
          treeBuilder(projects.find(v => v.id === project.parent.id));
        }
        treed[project.parent.id].children = treed[project.parent.id].children || [];
        treed[project.parent.id].children.push(project);
      } else {
        this._cache['projects::tree'].push(project);
      }
      treed[project.id] = project;
    };

    for (const project of projects) {
      treeBuilder(project);
    }

    return this._cache['projects::tree'];
  }

  /**
   * @param {(number|string|import('../../types').T_RedmineID)} project 
   */
  async getRootProject(project) {
    const projects = await this.listProjects();

    let root = projects.find(v => {
      if (typeof project === 'number') {
        return v.id === project;
      } else if (typeof project === 'string') {
        return v.name === project;
      } else {
        return v.id === project.id;
      }
    });

    while (root.parent) {
      root = projects.find(v => v.id === root.parent.id);
    }
    return root;
  }

  /**
   * @param {(number|string|import('../../types').T_RedmineID)} projectid 
   * @param {import('../../types').T_RedminePagingOptions} param 
   * @returns {Promise<import('../../types').T_RedmineMembership[]>}
   */
  getMemberships(projectid, param = {}) {
    if (typeof projectid === 'object') projectid = projectid.id;
    return this.promiseAll('memberships', 'membership_by_project_id', projectid, param);
  }

  normalizeUserName(name) {
    return name.replace(/é/g, 'e').replace(/ó/g, 'o');
  }

  /**
   * @param {import('../../types').T_RedmineIssueFilter} filters 
   * @returns {Promise<import('../../types').T_RedmineIssue[]>}
   */
  searchIssues(filters = {}) {
    return this.promiseAll('issues', 'issues', filters);
  }

}