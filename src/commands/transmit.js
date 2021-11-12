const Command = require('../Command');
const Moment = require('moment');
const Strtotime = require('nodestrtotime');
const CLITable = require('../util/CLITable');

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
      .usage('--from "-1 weeks" --to "now"')
      .description('transmit trackings from toggl to redmine');
  }

  async action() {
    const table = new CLITable({
      issue: 'Ticket',
      comment: 'Comment',
      activity: 'Activitiy',
      hours: 'Hour`s',
      project: 'Project',
    });

    if (!this.tracker.config.get('redmine.fallback.api.apiKey')) {
      this.error('Please create a fallback redmine connection.');
      this.error('Use "tracker redmine add" to create a connection.');
      return;
    }

    this.toggl = await this.tracker.getToggl();
    const workspace = await this.getWorkspace();
    if (workspace === null) return;
    await this.initTags(workspace);

    const trackings = (await this.toggl.getTimeEntries(this.opts.from, this.opts.to)).filter((v) => {
      return v.stop !== undefined && (v.tags === undefined || (!v.tags.includes('t:transmitted') && !v.tags.includes('t:no-transmit')));
    });

    if (trackings.length === 0) {
      console.log('No time entries in this time range (' + Moment.unix(Strtotime(this.opts.from)).format('HH:mm:SS DD.MM.YYYY') + ' - ' + Moment.unix(Strtotime(this.opts.to)).format('HH:mm:SS DD.MM.YYYY') + ')');
      return;
    }

    for (const tracking of trackings) {
      const issuePattern = /#([0-9a-z-]+)/;
      const commentPattern = / - (?!.* - )(.+)$/;
      let description = tracking.description || '';
      let issue = '';
      let comment = '';

      if (!this.opts.dry) console.log();
      if (!this.opts.dry) console.log('[TRANSMIT]: ' + description + ' [' + tracking.id + ']');
      const redmine = await this.tracker.getRedmine(tracking.pid);
      if (!this.opts.dry) console.log('SELECT PROJECT:', redmine.getName());

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
              return 'Unknown command.'
            }
          });
          if (issue === 'skip' || issue === 's') {
            console.log('SKIP: ' + description + ' [' + tracking.id + ']');
            continue;
          }
          if (issue === 'ignore' || issue === 'i') {
            console.log('IGNORE: ' + description + ' [' + tracking.id + ']');
            await this.toggl.addTag([tracking.id], ['t:no-transmit']);
            continue;
          }
        }
      }

      const commentMatch = description.match(commentPattern);
      if (commentMatch && commentMatch[1]) {
        comment = commentMatch[1].trim();
      } else {
        if (this.opts.dry && !issue) {
          comment = '<no description>';
          issue = '<no ticket>';
        } else {
          comment = (await redmine.getIssue(issue)).subject;
        }
      }
      
      const hours = Math.round(tracking.duration / 36) / 100;
      const activity = this.tracker.config.get('redmine.' + redmine.project + '.activity', 9);
      const when = Moment.unix(Strtotime(tracking.start));
      const customFields = this.getCustomFields(tracking);

      if (!this.opts.dry) await redmine.createTimeEntry(issue, hours, activity, comment, when, customFields);
      if (!this.opts.dry) await this.toggl.addTag([tracking.id], ['t:transmitted']);
      if (this.opts.dry) {
        table.add({issue, comment, activity, hours, project: redmine.getName()});
      } else {
        console.log('[TRANSMITTED]: ' + description + ' [' + tracking.id + '] - ' + comment);
      }
    }
    if (this.opts.dry) {
      table.log();
    }
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