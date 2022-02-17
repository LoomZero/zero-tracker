const UrlPattern = require('url-pattern');
const Color = require('zero-kit/src/cli/Color');
const CLITable = require('zero-kit/src/cli/CLITable');
const Command = require('../Command');
const TrackerError = require('../error/TrackerError');
const Input = require('zero-kit/src/cli/Input');

module.exports = class DoCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('do')
      .arguments('<action> <params...>')
      .description('Execute commands.');
  }

  /**
   * @returns {Promise<import('../../types').T_RedmineStatus[]>}
   */
  async getStates() {
    if (this._states === undefined) {
      this._states = await this.redmine.listStatus();
    }
    return this._states;
  }

  /**
   * @param {import('../../types').T_RedmineIssue} ticket
   * @returns {Promise<import('../../types').T_RedmineMembership[]>}
   */
  async getMemberships(ticket) {
    this._memberships = this._memberships || {};
    if (this._memberships[ticket.project.id] === undefined) {
      this._memberships[ticket.project.id] = await this.redmine.getMemberships(ticket.project);
    }
    return this._memberships[ticket.project.id];
  }

  /**
   * @param {import('../../types').T_RedmineIssue} ticket
   * @returns {Promise<import('../../types').T_RedmineID[]>}
   */
  async getUsers(ticket) {
    this._users = this._users || {};
    if (this._users[ticket.project.id] === undefined) {
      this._users[ticket.project.id] = [];
      const memberships = await this.getMemberships(ticket);
      for (const index in memberships) {
        if (memberships[index].user) {
          memberships[index].user.name = this.redmine.normalizeUserName(memberships[index].user.name);
          this._users[ticket.project.id].push(memberships[index].user);
        } else if (memberships[index].group) {
          memberships[index].group.name = this.redmine.normalizeUserName(memberships[index].group.name);
          this._users[ticket.project.id].push(memberships[index].group);
        }
      }
    }  
    return this._users[ticket.project.id];
  }

  /**
   * @param {import('../../types').T_RedmineIssue} ticket 
   * @param {string}
   * @returns {import('../../types').T_RedmineUpdateIssue}
   */
  async getConfigChanges(ticket, action) {
    const project = await this.redmine.getRootProject(ticket.project);

    let changes = this.tracker.configActions.get(action + '.projects.' + project.identifier + '.changes');
    if (changes === null) changes = this.tracker.configActions.get(action + '.changes');
    if (changes === null) changes = {};
    return changes;
  }

  async action(action, params) {
    try {
      if (typeof this['action_' + action] === 'function') {
        await this['action_' + action](params);
      } else {
        throw Color.out('error', 'Unknown action {action}', {action});
      }
    } catch (e) {
      if (e instanceof TrackerError) {
        e.log();
      } else {
        if (this.tracker.isDebug) {
          Color.log('error', e.stack || e);
        } else {
          Color.log('error', e.message || e);
        }
      }
      Color.log('section.abort', 'Abort, caused by error');
    }
  }

  async action_change(params) {
    const url = '/' + params.join('/');
    this.toggl = await this.tracker.getToggl();
    this.redmine = await this.tracker.getRedmine();

    const ticket = await this.getTicket(url);
    if (ticket === null) return Color.log('section.abort', 'Abort');

    const changes = await this.getChanges(ticket, url);
    
    this.logChanges(changes);
  }

  async action_fix(params) {
    return await this.action_finish(params);
  }

  async action_finish(params) {
    const url = '/' + params.join('/');
    this.toggl = await this.tracker.getToggl();
    this.redmine = await this.tracker.getRedmine();
   
    const ticket = await this.getTicket(url);
    if (ticket === null) return Color.log('section.abort', 'Abort');

    const changes = await this.getConfigChanges(ticket, 'finish');
    await this.getChanges(ticket, url, changes);

    await this.executeChanges(ticket, changes);
  }

  async action_take(params) {
    const url = '/' + params.join('/');
    this.toggl = await this.tracker.getToggl();
    this.redmine = await this.tracker.getRedmine();
   
    const ticket = await this.getTicket(url);
    if (ticket === null) return Color.log('section.abort', 'Abort');

    const changes = await this.getConfigChanges(ticket, 'take');
    await this.getChanges(ticket, url, changes);

    await this.executeChanges(ticket, changes);
  }

  /**
   * @param {import('../../types').T_RedmineIssue} ticket
   * @param {import('../../types').T_RedmineUpdateIssue} changes
   */
  async executeChanges(ticket, changes) {
    this.logChanges(ticket, changes);

    if (!this.opts.yes) {
      console.log();
      if (!await Input.input('Is this ok? (y/n): ', Input.optionsBoolean())) {
        Color.log('section.abort', 'Abort');
        return;
      }
    }

    await this.redmine.updateIssue(ticket.id, changes);
    Color.log('section.success', 'Finished');
  }

  /**
   * @param {import('../../types').T_RedmineUpdateIssue} changes 
   */
  logChanges(ticket, changes) {
    const table = new CLITable({change: 'Change', from: 'From', op: '=>', to: 'To'});

    for (const field in changes) {
      switch(field) {
        case 'notes':
          table.add(['Comment', '-', '=', changes[field]]);
          break;
        case 'assigned':
          table.add(['Assignee', ticket.assigned_to ? ticket.assigned_to.name : '<none>', '=>', changes[field].name]);
          break;
        case 'status':
          table.add(['Status', ticket.status.name, '=>', changes[field].name]);
          break;
        case 'subject':
          table.add(['Subject', ticket.subject, '=>', changes[field]]);
          break;
        default:
          console.log('Unknown field:', field);
      }
    }
    table.log();
  }

  /**
   * @param {string} url 
   * @param {boolean} print
   * @returns {import('../../types').T_RedmineIssue|null}
   */
  async getTicket(url, print = true) {
    const ticket = this.match('ticket', ':id', url, false);

    if (ticket.id === 'current') {
      const issuePattern = /#([0-9a-z-]+)/;
      const current = await this.toggl.getCurrent();
      if (current === null) {
        Color.log('error', 'No current tracking.');
        return null;
      }
      const match = current.description.match(issuePattern);

      if (match && match[1]) {
        ticket.id = match[1];
      } else {
        return null;
      }
    }

    if (!this.isInt(ticket.id)) {
      const bag = {
        filter: {
          offset: 0,
          limit: 5,
          sort: 'updated_on:desc',
          subject: '~' + ticket.id,
        },
      };

      const fromMatch = this.match('from', ':project', url, false);
      const projects = await this.redmine.listProjects();
      let found = null;
      if (found = projects.find(v => v.name.toLowerCase().includes(fromMatch.project) || v.identifier.includes(fromMatch.project))) {
        bag.filter.project_id = found.identifier;
      }

      do {
        let issues = await this.redmine.searchIssues(bag.filter);

        const options = {
          '': 'FIRST',
          '0': 'MORE',
        };

        console.log('Choose an issue:');
        for (const index in issues) {
          options[(parseInt(index) + 1) + ''] = issues[index];
          console.log('  -', (parseInt(index) + 1) + ':', '"' + issues[index].subject + '" [by ' + issues[index].author.name + ']');
        }
        console.log('  - 0: More Issues (' + (bag.filter.offset / bag.filter.limit + 1) + '/' + Math.ceil(this.redmine.response.total_count / bag.filter.limit) + ')');
        let index = await Input.input('Press a number: ', Input.optionsSelect({type: 'read', fallback: ''}, Object.keys(options)));

        if (options[index] === 'FIRST') {
          index = '1';
        } else if (options[index] === 'MORE') {
          bag.filter.offset += bag.filter.limit;
        }
        
        if (typeof options[index] === 'object') bag.result = options[index];
      } while (!bag.result);
      
      ticket.id = bag.result.id;
    }

    try {
      const issue = await this.redmine.getIssue(ticket.id);
      if (print) {
        CLITable.create({field: 'Selected Ticket', value: issue.id}, [
          ['Project', issue.project.name],
          ['Subject', issue.subject],
          ['Status', issue.status.name],
        ]).log();
      }
      return issue;
    } catch (e) {
      if (e instanceof TrackerError) {
        e.log();
      } else {
        Color.log('error', e.message || e);
      }
      return null;
    }
  }

  /**
   * @param {import('../../types').T_RedmineIssue} ticket 
   * @param {string} url 
   * @param {import('../../types').T_RedmineUpdateIssue} changes
   */
  async getChanges(ticket, url, changes = {}) {
    const toMatches = this.match(['give/to', 'to'], ':value', url, true);
    if (toMatches) {
      await this.getToChanges(changes, ticket, toMatches);
    }
    
    let withMatches = this.match(['with', 'set'], ':type/:value', url);
    if (!withMatches || !withMatches.find(v => ['comment', 'note', 'message'].includes(v.type))) {
      const commentMatch = this.match(['comment', 'note', 'message'], ':value', url, false);
      if (commentMatch) {
        withMatches = withMatches || [];
        commentMatch.type = 'message';
        withMatches.push(commentMatch);
      }
    }
    
    if (withMatches) {
      await this.getWithChanges(changes, ticket, withMatches);
    }

    if (changes.notes) {
      const onMatch = this.match('on', ':value', url, false);

      if (onMatch && onMatch.value) {
        changes.notes = changes.notes.replace(/\{on\}/g, onMatch.value);
      } else {
        changes.notes = changes.notes.replace(/\{on\}/g, '');
      }
    }
  }

  /**
   * @param {import('../../types').T_RedmineUpdateIssue} changes
   * @param {import('../../types').T_RedmineIssue} ticket 
   * @param {Object[]} matches 
   */
  async getToChanges(changes, ticket, matches) {
    /** @type {import('../../types').T_RedmineUpdateIssue} */
    const states = await this.getStates();
    const users = await this.getUsers(ticket);

    for (const match of matches) {
      const matcher = this.redmine.normalizeUserName(match.value.toLowerCase());
      const state = this.find(states, v => v.name.toLowerCase(), matcher);
      if (state) {
        changes.status = state;
        continue;
      }

      const user = this.find(users, v => v.name.toLowerCase(), matcher);
      if (user) {
        changes.assigned = user;
        continue;
      }

      throw Color.out('error', 'Unknown user or state for to-part: {name}', {name: match.value});
    }
  }

  /**
   * @param {import('../../types').T_RedmineUpdateIssue} changes
   * @param {import('../../types').T_RedmineIssue} ticket 
   * @param {Object[]} matches 
   */
  async getWithChanges(changes, ticket, matches) {
    for (const match of matches) {
      switch (match.type) {
        case 'message':
        case 'comment':
        case 'note':
          changes.notes = match.value;
          break;
        case 'subject':
        case 'titel':
          changes.subject = match.value;
          break;
        case 'state':
        case 'status':
          if (changes.status) throw Color.out('error', 'Duplicate setting of status with {original} and {duplicate}', {original: changes.status.name, duplicate: match.value});
          const states = await this.getStates();
          const state = this.find(states, v => v.name.toLowerCase(), this.redmine.normalizeUserName(match.value.toLowerCase()));
          if (state) changes.status = state;
          break;
        case 'user':
        case 'assigned':
        case 'assign':
          if (changes.assigned) throw Color.out('error', 'Duplicate setting of user with {original} and {duplicate}', {original: changes.assigned.name, duplicate: match.value});
          const users = await this.getUsers(ticket);
          const user = this.find(users, v => v.name.toLowerCase(), this.redmine.normalizeUserName(match.value.toLowerCase()));
          if (user) changes.assigned = user;
          break;
        default:
          throw Color.out('error', 'Unknown type for with-part: {type} => {value}', match);
      }
    }
  }

  find(values, callback, match) {
    let found = values.find(v => callback(v).startsWith(match));
    if (!found) {
      found = values.find(v => callback(v).includes(match));
    }
    return found;
  }

  /**
   * @param {(string|string[])} action
   * @param {string} pattern 
   * @param {string} url 
   * @param {boolean} and 
   * @returns 
   */
  match(action, pattern, url, and = true) {
    if (!Array.isArray(action)) action = [action];

    for (const select of action) {
      const matcher = new UrlPattern('*/' + select + '/' + pattern + '(/*)');
      const andMatcher = new UrlPattern('/and/' + pattern + '(/*)');
      const values = [];

      let match = matcher.match(url);
      if (match && !and) return match; 
      while (match !== null) {
        values.push(match);
        url = (Array.isArray(match._) ? match._[match._.length - 1] : match._);
        match = andMatcher.match('/' + url);
      }
      if (values.length) return values;
    }
    return null;
  }

}