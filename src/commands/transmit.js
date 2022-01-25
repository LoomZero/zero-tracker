const Command = require('../Command');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');
const Input = require('zero-kit/src/cli/Input');
const Color = require('zero-kit/src/cli/Color');
const CLITable = require('zero-kit/src/cli/CLITable');
const RedmineError = require('../error/RedmineError');

/**
 * @typedef {Object} T_TransmitItem
 * @property {import('../../types').T_TogglTracking} tracking
 * @property {number} [issue]
 * @property {string} description
 * @property {import('../connector/RedmineConnector')} redmine
 * @property {string} state
 * @property {number} [hours]
 * @property {Moment.Moment} [when]
 * @property {string} [comment]
 * @property {import('../../types').T_TogglTracking[]} [merged]
 * @property {string[]} [info]
 * @property {number} [activity]
 * @property {any} [customFields]
 * @property {import('../error/TrackerError')} [error]
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
      .option('--workspace <workspace>', 'Enter a workspace id', this.fallback('workspace', 'first'))
      .option('--mode <mode>', 'Enter a mode', this.fallback('mode', 'normal'))
      .option('--dry', 'Dry run', false)
      .option('--round <round>', 'Round to x min', this.fallback('round', false))
      .option('--merge', 'Merge tickets hours', this.fallback('merge', false))
      .option('-f, --force <force>', 'Force the unknown issue to a state (Allowed: skip (s), ignore (i))', this.fallback('force', false))
      .option('-y, --yes', 'Accept the transmit', this.fallback('yes', false))
      .usage('--from "-1 weeks" --to "now"')
      .description('transmit trackings from toggl to redmine');
  }

  async action() {
    this.tracker.checkRedmine();

    if (this.opts.force) {
      if (['skip', 's', 'ignore', 'i'].includes(this.opts.force)) {
        if (this.opts.force === 's') this.opts.force = 'skip';
        if (this.opts.force === 'i') this.opts.force = 'ignore';
      } else {
        Color.log('error', 'Only {skip} or {ignore} are valid values for option {force}', {skip: 'skip', ignore: 'ignore', force: '--force'});
        return;
      }
    }

    this.tracker.debug('Ready and init for transmit');
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
      Color.log('section.warning', 'No time entries in this time range {from} - {to}', {
        from: Moment.unix(Strtotime(this.opts.from)).format('HH:mm:SS DD.MM.YYYY'),
        to: Moment.unix(Strtotime(this.opts.to)).format('HH:mm:SS DD.MM.YYYY'),
      });
      return;
    }

    this.tracker.debug('Start transmit validation');
    for (const tracking of trackings) {
      const issuePattern = /#([0-9a-z-]+)/;
      let description = tracking.description || '';
      let issue = '';
      const redmine = await this.tracker.getRedmine(tracking.pid);

      this.tracker.debug('Try find the issue {context}', {}, {description});
      const issueMatch = description.match(issuePattern);
      if (issueMatch && issueMatch[1]) {
        issue = issueMatch[1];
        this.tracker.debug('Found issue id {context}', {}, {issue});
      }  else {
        this.tracker.debug('Not found issue id {context}', {}, {description, dry: this.opts.dry});
        if (!this.opts.dry) {
          if (this.opts.force) {
            this.tracker.debug('Force execution {context}', {}, {force: this.opts.force});
            issue = this.opts.force;
          } else {
            console.log('No issue ID found on tracking "' + description + ' [' + tracking.id + ']"');
            issue = await Input.input('Issue Number (#/s/i/?): ', {validate: async (answer) => {
              if (this.isInt(answer)) {
                try {
                  console.log('Ticket: ' + (await redmine.getIssue(Number.parseInt(answer))).subject);
                } catch (e) {
                  const error = JSON.parse(e);
                  if (error.ErrorCode === 404) {
                    return 'This issue is not known.';
                  }
                }
                if (await Input.input('Is this the ticket? (y/n): ', Input.optionsBoolean())) {
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
            }});
          }
          if (issue === 'skip' || issue === 's') {
            transmitting.push({
              tracking, description, redmine, state: 'skip',
            });
            continue;
          }
          if (issue === 'ignore' || issue === 'i') {
            transmitting.push({
              tracking, description, redmine, state: 'ignore',
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

      this.tracker.debug('Add tracking to transmit list {context}', {}, {issue, description});
      transmitting.push({
        tracking, issue, description, redmine, state: 'transmit',
      });
    }

    if (this.opts.merge) {
      this.tracker.debug('Start merging {context}', {}, {merge: this.opts.merge});
      /** @type {T_TransmitItem[]} */
      const merged = [];
      for (const transmit of transmitting) {
        transmit.when = this.getWhen(transmit.tracking);
        transmit.customFields = this.getCustomFields(transmit.tracking);
        if (transmit.state !== 'transmit') {
          merged.push(transmit);
          this.tracker.debug('Ignore tracking {context}', {}, {state: transmit.state});
          continue;
        }
        const index = merged.findIndex(v => v.issue === transmit.issue && v.when.format('DD-MM-YYYY') === transmit.when.format('DD-MM-YYYY') && JSON.stringify(v.customFields || '') === JSON.stringify(transmit.customFields || ''));
        if (index !== -1) {
          this.tracker.debug('Try to merge with index {index} {context}', {index}, {issue: transmit.issue});
          try {
            if (merged[index].comment === '') merged[index].comment = await this.getComment(transmit);
          } catch (e) {
            if (e instanceof RedmineError) {
              transmit.comment = Color.out('error', e.info());
              transmit.error = e;
              transmit.state = 'error';
              continue;
            } else {
              throw e;
            }
          }
          const hours = this.getHours(transmit.tracking);
          merged[index].hours += hours;
          merged[index].info.push(hours);
          merged[index].merged.push(transmit.tracking);
        } else {
          this.tracker.debug('Try to add with index {index} {context}', {index: merged.length}, {issue: transmit.issue});
          transmit.hours = this.getHours(transmit.tracking);
          try {
            transmit.comment = await this.getComment(transmit);
          } catch (e) {
            if (e instanceof RedmineError) {
              transmit.comment = Color.out('error', e.info());
              transmit.error = e;
              transmit.state = 'error';
            } else {
              throw e;
            }
          }
          transmit.info = [transmit.hours];
          transmit.merged = [transmit.tracking];
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
      return (await (transmit.redmine.getIssue(transmit.issue))).subject;
    } 
    return '';
  }

  /**
   * @param {import('../../types').T_TogglTracking} tracking 
   * @returns {Moment.Moment}
   */
  getWhen(tracking) {
    this.tracker.debug('Get when from tracking {context}', {}, {start: tracking.start});
    return Moment.unix(Strtotime(tracking.start));
  }

  /**
   * @param {import('../../types').T_TogglTracking} tracking 
   * @param {boolean} total 
   * @returns {number}
   */
  getHours(tracking, total = false) {
    this.tracker.debug('Get when from tracking {context}', {}, {duration: tracking.duration, total});
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
    this.tracker.debug('Start grouping, visualize and transmitting');
    this.tracker.debug('Start grouping');
    /** @type {Object<string, T_TransmitItem[]>} */
    const grouped = {};
    for (const transmit of transmitting) {
      const when = Moment.unix(Strtotime(transmit.tracking.start));
      if (grouped[when.format('DD.MM.YYYY')] === undefined) grouped[when.format('DD.MM.YYYY')] = [];
      grouped[when.format('DD.MM.YYYY')].push(transmit);
    }

    const header = this.tracker.config.get('commands.transmit.output', {
      state: 'Status',
      description: 'Tracking',
      issue: 'Ticket',
      comment: 'Comment',
      activity: 'Activitiy',
      hours: 'Hour`s',
      when: 'When',
      project: 'Redmine (Project)',
      info: 'Info',
    });

    this.tracker.debug('Start visualize header: {context}', {}, header);

    const table = new CLITable(header);
    for (const day in grouped) {
      table.add([], [this.colorGreen('Date:'), this.colorGreen(day)]);
      const items = grouped[day];
      let totalSkipped = 0;
      let total = 0;
      for (const transmit of items) {
        try {
          transmit.comment = transmit.comment ?? await this.getComment(transmit);
        } catch (e) {
          if (e instanceof RedmineError) {
            transmit.comment = Color.out('error', e.info());
            transmit.error = e;
            transmit.state = 'error';
          } else {
            throw e;
          }
        }
        transmit.hours = this.preprocessHours(transmit.hours ?? this.getHours(transmit.tracking));
        transmit.activity = this.tracker.config.get('redmine.' + transmit.redmine.project + '.activity', 9);
        transmit.when = transmit.when || this.getWhen(transmit.tracking);
        transmit.customFields = transmit.customFields ? transmit.customFields : this.getCustomFields(transmit.tracking);
  
        if (transmit.state === 'transmit') {
          total += transmit.hours;
        } else {
          totalSkipped += transmit.hours;
        }
        const item = {
          description: transmit.description ? transmit.description : '<no description>',
          issue: transmit.issue ? transmit.issue : '<no issue>',
          comment: transmit.comment ? transmit.comment : '<no comment>',
          activity: transmit.activity, 
          hours: this.getShowHours(transmit.hours) + ' (' + this.getTime(transmit.hours) + ')',
          when: transmit.when.format('HH:mm:SS'),
          project: transmit.redmine.getName(),
          state: transmit.state,
        };
        if (transmit.info) item.info = transmit.info.join(', ');
        if (transmit.customFields.length) item.info = (item.info ? item.info + ', ' : '') + this.getCustomFieldsInfo(transmit.customFields);
        table.add(item);
      }
      table.add([]);
      table.add(
        ['Total Skipped:', this.getShowHours(totalSkipped) + ' (' + this.getTime(totalSkipped) + ')'],
        ['Total:', this.getShowHours(total) + ' (' + this.getTime(total) + ')'],
      );
    }
    this.tracker.debug('Log Table {context}', {}, {dry: this.opts.dry, yes: this.opts.yes});
    table.log();
    if (this.opts.dry) return;
    if (!this.opts.yes) {
      console.log();
      if (!await Input.input('Is this ok? (y/n): ', Input.optionsBoolean())) {
        Color.log('section.abort', 'Abort');
        return;
      }
    } 
    
    this.tracker.debug('Start transmitting');
    const errors = [];
    for (const day in grouped) {
      this.tracker.debug('Start transmitting day {day}', {day});
      console.log();
      console.log('Transmit day ' + day + ' ...');
      for (const transmit of grouped[day]) {
        if (transmit.state === 'transmit') {
          process.stdout.write('TRANSMIT: ' + (transmit.issue ? transmit.issue : '<no issue>') + ' - ' + (transmit.comment ? transmit.comment : '<no comment>') + ' - ' + this.getTime(transmit.hours) + ' ... ');
          try {
            await transmit.redmine.createTimeEntry(transmit.issue, transmit.hours, transmit.activity, transmit.comment, transmit.when, transmit.customFields);
            if (transmit.merged) {
              for (const tracking of transmit.merged) {
                await this.toggl.addTag([tracking.id], ['t:transmitted']);
              }
            } else {
              await this.toggl.addTag([transmit.tracking.id], ['t:transmitted']);
            }
            console.log(this.colorGreen('transmitted'));
          } catch (error) {
            Color.log('error', 'Error WIP');
            errors.push({error, transmit});
          }
        } else {
          console.log(transmit.state.toUpperCase() + ': ' + (transmit.issue ? transmit.issue : '<no issue>') + ' - ' + (transmit.comment ? transmit.comment : '<no comment>') + ' - ' + this.getTime(transmit.hours));
          if (transmit.state === 'ignore') {
            await this.toggl.addTag([transmit.tracking.id], ['t:no-transmit']);
          }
        }
      }
    }
    Color.log('section.success', 'Finished');
  }

  /**
   * @param {string} message 
   * @returns {string}
   */
  colorGreen(message) {
    return '\x1b[32m' + message + '\x1b[0m';
  }

  /**
   * @param {import('../../types').T_TogglTracking} tracking 
   * @returns {array}
   */
  getCustomFields(tracking) {
    if (tracking.tags === undefined) {
      this.tracker.debug('No customfields for tracking because no tags {context}', {}, {id: tracking.id});
      return [];
    }
    this.tracker.debug('Get customfields from tracking {context}', {}, {id: tracking.id, tags: tracking.tags.join(', ')});
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

  /**
   * @param {array} customFields 
   * @returns {string}
   */
  getCustomFieldsInfo(customFields) {
    const info = [];
    for (const field of customFields) {
      if (field.id === 3) {
        switch (field.value) {
          case 1:
            info.push('Billable');
            break;
          case 2:
            info.push('Non-Billable');
            break;
          case 3:
            info.push('Pauschal');
            break;
        }
      }
    }
    return (info ? 'Abbrechnung: ' + info.join(', ') : '');
  }

  async initTags(workspace) {
    this.tracker.debug('Check workspace tags {context}', {}, {workspace});
    const tags = ['t:transmitted', 't:no-transmit', 't:te:billable', 't:te:nonbillable', 't:te:pauschal'];
    const items = await this.toggl.getWorkspaceTags(workspace);

    for (const item of items) {
      const index = tags.findIndex((v) => v === item.name);
      if (index !== -1) {
        tags.splice(index, 1);
      }
    }
    for (const tag of tags) {
      this.tracker.debug('Try to create workspace tag. {context}', {}, {workspace, tag});
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
          const id = await Input.input('Select (write the ID): ', {validate: (answer) => {
            const id = Number.parseInt(answer);
            if (ids.includes(id)) return true;
            return 'Please select a valid ID.';
          }});
          console.log('Select workspace:', id);
          return Number.parseInt(id);
        }
      case 'first':
        return workspaces.shift().id;
      default: 
        Color.log('error', 'Unknown option for workspace option.');
        return null;
    }
  }

}