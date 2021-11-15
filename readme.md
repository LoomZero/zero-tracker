- [1. - Install](#1---install)
  - [1.1. - WARNING: Please uninstall old tracker](#11---warning-please-uninstall-old-tracker)
- [2. - Update](#2---update)
- [3. - Uninstall](#3---uninstall)
- [4. - Change Config](#4---change-config)
  - [4.1. - Add default option for command](#41---add-default-option-for-command)
- [5. - Add Redmine Connection](#5---add-redmine-connection)
  - [5.1. - Add another Redmine Connection via project](#51---add-another-redmine-connection-via-project)
- [6. - COMMAND: `config <action>` - Manage configs](#6---command-config-action---manage-configs)
  - [6.1. - ARGUMENT: `edit` - Show the path to the config file](#61---argument-edit---show-the-path-to-the-config-file)
  - [6.2. - ARGUMENT: `show` - Show the current config](#62---argument-show---show-the-current-config)
  - [6.3. - ARGUMENT: `test` - Test the current config](#63---argument-test---test-the-current-config)
- [7. - COMMAND: `destroy` - Remove local files](#7---command-destroy---remove-local-files)
- [8. - COMMAND: `redmine <action>` - Manage redmine connection](#8---command-redmine-action---manage-redmine-connection)
  - [8.1. - ARGUMENT: `add` - Add a redmine connection](#81---argument-add---add-a-redmine-connection)
  - [8.2. - ARGUMENT: `show` - Show all redmine connections](#82---argument-show---show-all-redmine-connections)
  - [8.3. - ARGUMENT: `remove` - Remove a redmine connection](#83---argument-remove---remove-a-redmine-connection)
  - [8.4. - OPTION: `--workspace <workspaceid>` - The workspice ID](#84---option---workspace-workspaceid---the-workspice-id)
- [9. - COMMAND: `setup` - Setup the tracker](#9---command-setup---setup-the-tracker)
- [10. - COMMAND: `transmit` - Transmit all trackings from toggl to redmine](#10---command-transmit---transmit-all-trackings-from-toggl-to-redmine)
  - [10.1. - OPTION: `--from <moment>` - Range start](#101---option---from-moment---range-start)
  - [10.2. - OPTION: `--to <moment>` - Range end](#102---option---to-moment---range-end)
  - [10.3. - OPTION: `--workspace <workspaceid>` - The workspice ID](#103---option---workspace-workspaceid---the-workspice-id)
  - [10.4. - OPTION: `--dry` - Execute the command without transmit](#104---option---dry---execute-the-command-without-transmit)
  - [10.5. - OPTION: `--round <minutes>` - Round to minutes](#105---option---round-minutes---round-to-minutes)
  - [10.6. - OPTION: `--merge` - Merge the trackings per day](#106---option---merge---merge-the-trackings-per-day)
  - [10.7. - OPTION: `-f, --force <forceoption>` - Force the execution](#107---option--f---force-forceoption---force-the-execution)
  - [10.8. - OPTION: `-y, --yes` - Accept the transmit](#108---option--y---yes---accept-the-transmit)
  - [10.9. - CONFIG: `output` - Define the output Table](#109---config-output---define-the-output-table)

# 1. - Install

```shell
npm install -g https://github.com/LoomZero/zero-tracker.git
tracker setup
```

## 1.1. - WARNING: Please uninstall old tracker 

If installed via https://github.com/loomgmbh/node-tracker#install use:

```shell
cd ~/Custom/node/tracker
npm unlink
cd ..
rm -rf tracker
```

If installed via `"npm install -g"` use:

```shell
npm uninstall -g node-tracker
```

# 2. - Update

```shell
npm update -g zero-tracker
```

# 3. - Uninstall

```shell
tracker destroy
npm uninstall -g zero-tracker
```

# 4. - Change Config

Change the config by using the `tracker config edit` command to see the path of config file.

Please use `tracker config test` after changing the config file.

## 4.1. - Add default option for command

You can define default Options for all commands by defining a value in the config file using the pattern.

Pattern: `command.<command>.opts.<option> = <value>`

> `<command>` - The name of the command (e.g. `transmit`)

> `<option>` - The name of the option (e.g. `round`)

> `<value>` - The value of the option (e.g. `30`)

_Example: config.json - Use `transmit` command always with `round=30` and `merge` options_
```json
{ 
  ...
  "commands": {
    "transmit": {
      "opts": {
        "round": 30,
        "merge": true
      }
    }
  }
  ...
}
```

# 5. - Add Redmine Connection

```shell
tracker redmine add
```

## 5.1. - Add another Redmine Connection via project

- Create a project in toggl https://track.toggl.com/projects
- Use `"tracker redmine add"` if you have already a fallback connection choose your project
- Fill in all api parameters
- Add project to trackings and use `"tracker transmit"`

# 6. - COMMAND: `config <action>` - Manage configs

## 6.1. - ARGUMENT: `edit` - Show the path to the config file

Edit the config file and use `tracker config test` after saving.

For help see [4. - Change Config](#4---change-config).

## 6.2. - ARGUMENT: `show` - Show the current config

## 6.3. - ARGUMENT: `test` - Test the current config

Test the current config and shows the errors.

# 7. - COMMAND: `destroy` - Remove local files

Remove all local files created by this tool, to be ready for uninstall.

# 8. - COMMAND: `redmine <action>` - Manage redmine connection

## 8.1. - ARGUMENT: `add` - Add a redmine connection

Add a redmine connection for a toggl project or the fallback connection to redmine.

## 8.2. - ARGUMENT: `show` - Show all redmine connections

## 8.3. - ARGUMENT: `remove` - Remove a redmine connection

## 8.4. - OPTION: `--workspace <workspaceid>` - The workspice ID

Define the workspace. 

Use `select` to interactive select the workspace ID. If only 1 workspace is defined in toggl, select it.
Use `first` to select always the first workspace defined in toggl.
Use `<number>` to select a workspace by its ID.

> Config: `commands.redmine.opts.workspace`

> Type: `int, string, enum(select, first)`

> Default: `first`

# 9. - COMMAND: `setup` - Setup the tracker

Setup the default toggl and redmine connection.

# 10. - COMMAND: `transmit` - Transmit all trackings from toggl to redmine

Transmit all trackings from toggl to redmine, in a givin time range.

## 10.1. - OPTION: `--from <moment>` - Range start

Define the startpoint of the transmit range.

> Config:  `commands.transmit.opts.from`

> Type: `string`

> Default: `-1 days`

## 10.2. - OPTION: `--to <moment>` - Range end

Define the endpoint of the transmit range.

> Config:  `commands.transmit.opts.to`

> Type: `string`

> Default: `now`

## 10.3. - OPTION: `--workspace <workspaceid>` - The workspice ID

Define the workspace. 

Use `select` to interactive select the workspace ID. If only 1 workspace is defined in toggl, select it.
Use `first` to select always the first workspace defined in toggl.
Use `<number>` to select a workspace by its ID.

> Config: `commands.transmit.opts.workspace`

> Type: `int, string, enum(select, first)`

> Default: `first`

## 10.4. - OPTION: `--dry` - Execute the command without transmit

Test command to show what will be transmitted.

## 10.5. - OPTION: `--round <minutes>` - Round to minutes

Round the transmit values to a givin minutes up.

_If used with `--merge` the round will perform after the merge_

> Config:  `commands.transmit.opts.round`

> Type: `boolean, int`

> Default: `false`

## 10.6. - OPTION: `--merge` - Merge the trackings per day

Merge trackings by id, only per day.

> Config:  `commands.transmit.opts.merge`

> Type: `boolean`

> Default: `false`

## 10.7. - OPTION: `-f, --force <forceoption>` - Force the execution

Force the execution to `skip` or `ignore` all undefined trackings.

Use `--force skip (-f s)` to skip all trackings that have no ticket IDs.

Use `--force ignore (-f i)` to ignore all trackings that have no ticket IDs.

> Config:  `commands.transmit.opts.force`

> Type: `boolean, string, enum(skip, ignore, s, i)`

> Default: `false`

## 10.8. - OPTION: `-y, --yes` - Accept the transmit

Transmit the trackings without asking.

> Config:  `commands.transmit.opts.yes`

> Type: `boolean`

> Default: `false`

## 10.9. - CONFIG: `output` - Define the output Table

This change the output table. You can remove or rename columns.

> Config: `commands.transmit.output`

> Type: `Object`

> Default: 

```json
{
  "description": "Tracking",
  "issue": "Ticket",
  "comment": "Comment",
  "activity": "Activitiy",
  "hours": "Hour`s",
  "when": "When",
  "project": "Project",
  "state": "Status",
  "info": "Info"
}
```

_Example: config.json - Show only ticket ID and comment_
```json
{ 
  ...
  "commands": {
    "transmit": {
      "output": {
        "issue": "Ticket",
        "comment": "Comment"
      }
    }
  }
  ...
}
```
