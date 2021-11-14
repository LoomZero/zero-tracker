const Command = require('../Command');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');
const CLITable = require('../util/CLITable');

/**
 * @typedef {Object} T_TransmitItem
 * @property {import('../../types').T_TogglTracking} tracking
 * @property {number} [issue]
 * @property {string} description
 * @property {import('../connector/RedmineConnector')} redmine
 * @property {string} state
 * @property {number} [hours]
 * @property {string} [comment]
 * @property {number[]} [merged]
 */

module.exports = class TransmitCommand extends Command {

  /**
   * @param {import('commander').Command} program
   */
  init(program) {
    return program
      .command('transmit')
      .option('--from <from>', 'Enter a date string for from', this.fallback('from', '-1 days'))
      .option('--to <to>', 'Enter a date string for to', this.fallback('to', 'now'))
      .option('--workspace [workspace]', 'Enter a workspace id', this.fallback('workspace', 'first'))
      .option('--mode <mode>', 'Enter a mode', this.fallback('mode', 'normal'))
      .option('--dry', 'Dry run', false)
      .option('--round <round>', 'Round to x min', this.fallback('round', false))
      .option('--merge', 'Merge tickets hours', this.fallback('merge', false))
      .usage('--from "-1 weeks" --to "now"')
      .description('transmit trackings from toggl to redmine');
  }

  async action() {
    if (!this.tracker.config.get('redmine.fallback.api.apiKey')) {
      this.error('Please create a fallback redmine connection.');
      this.error('Use "tracker redmine add" to create a connection.');
      return;
    }

    this.toggl = await this.tracker.getToggl();
    const workspace = await this.getWorkspace();
    if (workspace === null) return;
    await this.initTags(workspace);

    /** @type {T_TransmitItem[]} */
    const transmitting = [];
    const trackings = (await this.toggl.getTimeEntries(this.opts.from, this.opts.to)).filter((v) => {
      return v.stop !== undefined && (v.tags === undefined || (!v.tags.includes('t:transmitted') && !v.tags.includes('t:no-transmit')));
    });

    if (trackings.length === 0) {
      console.log('No time entries in this time range (' + Moment.unix(Strtotime(this.opts.from)).format('HH:mm:SS DD.MM.YYYY') + ' - ' + Moment.unix(Strtotime(this.opts.to)).format('HH:mm:SS DD.MM.YYYY') + ')');
      return;
    }

    for (const tracking of trackings) {
      const issuePattern = /#([0-9a-z-]+)/;
      let description = tracking.description || '';
      let issue = '';
      const redmine = await this.tracker.getRedmine(tracking.pid);

      const issueMatch = description.match(issuePattern);
      if (issueMatch && issueMatch[1]) {
        issue = issueMatch[1];
      }  else {
        if (!this.opts.dry) {
          console.log('No issue ID found on tracking "' + description + ' [' + tracking.id + ']"');
          issue = await this.tracker.input('Issue Number (#/s/i/?): ', async (answer) => {
            if (this.isInt(answer)) {
              try {
                console.log('Ticket: ' + (await redmine.getIssue(Number.parseInt(answer))).subject);
              } catch (e) {
                const error = JSON.parse(e);
                if (error.ErrorCode === 404) {
                  return 'This issue is not known.';
                }
              }
              if (await this.tracker.input('Is this the ticket? (y/n): ') !== 'y') {
                return 'abort';
              } else {
                description = '#' + answer + ' - ' + description;
                await this.toggl.updateTimeEntry(tracking.id, { description });
                console.log('UPDATE: ' + description + ' [' + tracking.id + ']');
              }
            } else if (answer === 'help' || answer === '?') {
              console.log('Help:');
              console.log('Use "ignore" or "i" to ignore the tracking in further transmit.');
              console.log('Use "skip" or "s" to ignore the tracking in current transmit.');
              console.log('Use "help" or "?" to show current help');
              return '';
            } else if (!['skip', 'ignore', 's', 'i'].includes(answer)) {
              return 'Unknown option.'
            }
          });
          if (issue === 'skip' || issue === 's') {
            transmitting.push({
              tracking, description, redmine, state: 'skip'
            });
            continue;
          }
          if (issue === 'ignore' || issue === 'i') {
            await this.toggl.addTag([tracking.id], ['t:no-transmit']);
            transmitting.push({
              tracking, description, redmine, state: 'ignore'
            });
            continue;
          }
        } else {
          transmitting.push({
            tracking, description, redmine, state: 'skip / ignore',
          });
          continue;
        }
      }

      transmitting.push({
        tracking, issue, description, redmine, state: 'transmit'
      });
    }

    if (this.opts.merge) {
      /** @type {T_TransmitItem[]} */
      const merged = [];
      for (const transmit of transmitting) {
        if (transmit.state !== 'transmit') {
          merged.push(transmit);
          continue;
        }
        const index = merged.findIndex(v => v.issue === transmit.issue);
        if (index !== -1) {
          if (merged[index].comment === '') merged[index].comment = await this.getComment(transmit);
          const hours = this.getHours(transmit.tracking);
          merged[index].hours += hours;
          merged[index].merged.push(hours);
        } else {
          transmit.hours = this.getHours(transmit.tracking);
          transmit.comment = await this.getComment(transmit);
          transmit.merged = [transmit.hours];
          merged.push(transmit);
        }
      }
      await this.doTransmit(merged);
    } else {
      await this.doTransmit(transmitting);
    }
  }

  /**
   * @param {T_TransmitItem} transmit 
   * @returns {string}
   */
  async getComment(transmit) {
    const commentPattern = / - (?!.* - )(.+)$/;
    const commentMatch = transmit.description.match(commentPattern);

    if (commentMatch && commentMatch[1]) {
      return commentMatch[1].trim();
    } else if (transmit.issue) {
      return await (transmit.redmine.getIssue(transmit.issue)).subject;
    } 
    return '';
  }

  /**
   * @param {import('../../types').T_TogglTracking} tracking 
   * @returns {number}
   */
  getHours(tracking, total = false) {
    return Math.round(tracking.duration / 36) / 100;
  }

  /**
   * @param {number} hours 
   * @returns {number}
   */
  preprocessHours(hours) {
    if (this.opts.round) {
      const round = Number.parseInt(this.opts.round) / 60;
      const rounded = hours / round;

      if (rounded === Number.parseInt(rounded + '')) {
        return rounded * round;
      } else {
        return (Number.parseInt(rounded + '') + 1) * round;
      }
    }
    return hours;
  }

  /**
   * @param {number} hours 
   * @returns {number}
   */
  getShowHours(hours) {
    return Math.round(hours * 100) / 100;
  }

  /**
   * @param {number} hours 
   * @returns {string}
   */
  getTime(hours) {
    const split = (hours + '').split('.')
    const min = Math.round(Number.parseFloat('0.' + split[1]) * 60);
    return split[0] + ':' + (min < 10 ? '0' : '') + min;
  }

  /**
   * @param {T_TransmitItem[]} transmitting
   */
  async doTransmit(transmitting) {
    const header = this.tracker.config.get('commands.transmit.output', {
      description: 'Tracking',
      issue: 'Ticket',
      comment: 'Comment',
      activity: 'Activitiy',
      hours: 'Hour`s',
      when: 'When',
      project: 'Project',
      state: 'Status',
      info: 'Info',
    });

    const table = new CLITable(header);
    let totalSkipped = 0;
    let total = 0;
    for (const transmit of transmitting) {
      const comment = transmit.comment ?? await this.getComment(transmit);
      const hours = this.preprocessHours(transmit.hours ?? this.getHours(transmit.tracking));
      const activity = this.tracker.config.get('redmine.' + transmit.redmine.project + '.activity', 9);
      const when = Moment.unix(Strtotime(transmit.tracking.start));
      const customFields = this.getCustomFields(transmit.tracking);

      if (!this.opts.dry && transmit.state === 'transmit') {
        await transmit.redmine.createTimeEntry(issue, hours, activity, comment, when, customFields);
        await this.toggl.addTag([tracking.id], ['t:transmitted']);
      }
      if (transmit.state === 'transmit') {
        total += hours;
      } else {
        totalSkipped += hours;
      }
      const item = {
        description: transmit.description ? transmit.description : '<no description>',
        issue: transmit.issue ? transmit.issue : '<no issue>',
        comment: comment ? comment : '<no comment>',
        activity, 
        hours: this.getShowHours(hours) + ' (' + this.getTime(hours) + ')', 
        when: when.format('HH:mm:SS DD.MM.YYYY'),
        project: transmit.redmine.getName(),
        state: transmit.state,
      };
      if (transmit.merged) item.info = transmit.merged.join(', ');
      table.add(item);
    }
    table.add(
      {
        activity: 'Total Skipped:',
        hours: this.getShowHours(totalSkipped) + ' (' + this.getTime(totalSkipped) + ')',
      },
      {
        activity: 'Total:',
        hours: this.getShowHours(total) + ' (' + this.getTime(total) + ')',
      },
    );
    table.log();
  }

  /**
   * @param {import('../../types').T_TogglTracking} tracking 
   * @returns {array}
   */
  getCustomFields(tracking) {
    if (tracking.tags === undefined) return [];
    const customFields = [];
    const id = 3;
    const name = 'Abrechnung';
    const cfs = [
      { tag: 't:te:billable', value: 1, name: 'Billable' },
      { tag: 't:te:nonbillable', value: 2, name: 'Non-Billable' },
      { tag: 't:te:pauschal', value: 3, name: 'Pauschal' },
    ];
    
    for (const cf of cfs) {
      if (tracking.tags.includes(cf.tag)) {
        customFields.push({
          id, 
          name, 
          value: cf.value,
        });
      }
    }
    return customFields;
  }

  async initTags(workspace) {
    const tags = ['t:transmitted', 't:no-transmit', 't:te:billable', 't:te:nonbillable', 't:te:pauschal'];
    const items = await this.toggl.getWorkspaceTags(workspace);

    for (const item of items) {
      const index = tags.findIndex((v) => v === item.name);
      if (index !== -1) {
        tags.splice(index, 1);
      }
    }
    for (const tag of tags) {
      await this.toggl.createWorkspaceTag(workspace, tag);
      console.log('Created tag "' + tag + '" in workspace "' + workspace + '"');
    }
  }

  /**
   * @returns {(number|null)}
   */
  async getWorkspace() {
    if (this.isInt(this.opts.workspace)) return Number.parseInt(this.opts.workspace);
    const workspaces = await this.toggl.getWorkspaces();
    switch (this.opts.workspace) {
      case 'select':
        if (workspaces.length > 1 || true) {
          console.log('Workspaces:');
          const ids = workspaces.map((v) => {
            console.log(' - ' + v.id + ' "' + v.name + '"');
            return v.id;
          });
          const id = await this.tracker.input('Select (write the ID): ', (answer) => {
            const id = Number.parseInt(answer);
            if (ids.includes(id)) return true;
            return 'Please select a valid ID.';
          });
          console.log('Select workspace:', id);
          return Number.parseInt(id);
        }
      case 'first':
        return workspaces.shift().id;
      default: 
        this.error('Unknown option for workspace option.');
        return null;   
    }
  }

}