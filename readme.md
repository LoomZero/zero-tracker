- [1. - Install](#1---install)
  - [1.1. - WARNING: Please uninstall old tracker](#11---warning-please-uninstall-old-tracker)
- [2. - Update](#2---update)
- [3. - Uninstall](#3---uninstall)
- [4. - Add Redmine Connection](#4---add-redmine-connection)
  - [4.1. - Add another Redmine Connection via project](#41---add-another-redmine-connection-via-project)
- [5. - COMMAND: `config <action>` - Manage configs](#5---command-config-action---manage-configs)
  - [5.1. - ARGUMENT: `edit` - Show the path to the config file](#51---argument-edit---show-the-path-to-the-config-file)
  - [5.2. - ARGUMENT: `show` - Show the current config](#52---argument-show---show-the-current-config)
  - [5.3. - ARGUMENT: `test` - Test the current config](#53---argument-test---test-the-current-config)
- [6. - COMMAND: `destroy` - Remove local files](#6---command-destroy---remove-local-files)
- [7. - COMMAND: `redmine <action>` - Manage redmine connection](#7---command-redmine-action---manage-redmine-connection)
  - [7.1. - ARGUMENT: `add` - Add a redmine connection](#71---argument-add---add-a-redmine-connection)
  - [7.2. - ARGUMENT: `show` - Show all redmine connections](#72---argument-show---show-all-redmine-connections)
  - [7.3. - ARGUMENT: `remove` - Remove a redmine connection](#73---argument-remove---remove-a-redmine-connection)
  - [7.4. - OPTION: `--workspace <workspaceid>` - The workspice ID](#74---option---workspace-workspaceid---the-workspice-id)
- [8. - COMMAND: `setup` - Setup the tracker](#8---command-setup---setup-the-tracker)
- [9. - COMMAND: `transmit` - Transmit all trackings from toggl to redmine](#9---command-transmit---transmit-all-trackings-from-toggl-to-redmine)
  - [9.1. - OPTION: `--from <moment>` - Range start](#91---option---from-moment---range-start)
  - [9.2. - OPTION: `--to <moment>` - Range end](#92---option---to-moment---range-end)
  - [9.3. - OPTION: `--workspace <workspaceid>` - The workspice ID](#93---option---workspace-workspaceid---the-workspice-id)
  - [9.4. - OPTION: `--dry` - Execute the command without transmit](#94---option---dry---execute-the-command-without-transmit)
  - [9.5. - OPTION: `--round <minutes>` - Round to minutes](#95---option---round-minutes---round-to-minutes)
  - [9.6. - OPTION: `--merge` - Merge the trackings per day](#96---option---merge---merge-the-trackings-per-day)
  - [9.7. - OPTION: `-f, --force <forceoption>` - Force the execution](#97---option--f---force-forceoption---force-the-execution)
  - [9.8. - OPTION: `-y, --yes` - Accept the transmit](#98---option--y---yes---accept-the-transmit)
- [10. - Change Config](#10---change-config)
  - [10.1. - Add default option for command](#101---add-default-option-for-command)

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

# 4. - Add Redmine Connection

```shell
tracker redmine add
```

## 4.1. - Add another Redmine Connection via project

- Create a project in toggl https://track.toggl.com/projects
- Use `"tracker redmine add"` if you have already a fallback connection choose your project
- Fill in all api parameters
- Add project to trackings and use `"tracker transmit"`

# 5. - COMMAND: `config <action>` - Manage configs

## 5.1. - ARGUMENT: `edit` - Show the path to the config file

Edit the config file and use `tracker config test` after saving.

For help see [10. - Change Config](#10---change-config).

## 5.2. - ARGUMENT: `show` - Show the current config

## 5.3. - ARGUMENT: `test` - Test the current config

Test the current config and shows the errors.

# 6. - COMMAND: `destroy` - Remove local files

Remove all local files created by this tool, to be ready for uninstall.

# 7. - COMMAND: `redmine <action>` - Manage redmine connection

## 7.1. - ARGUMENT: `add` - Add a redmine connection

Add a redmine connection for a toggl project or the fallback connection to redmine.

## 7.2. - ARGUMENT: `show` - Show all redmine connections

## 7.3. - ARGUMENT: `remove` - Remove a redmine connection

## 7.4. - OPTION: `--workspace <workspaceid>` - The workspice ID

Define the workspace. 

Use `select` to interactive select the workspace ID. If only 1 workspace is defined in toggl, select it.
Use `first` to select always the first workspace defined in toggl.
Use `<number>` to select a workspace by its ID.

> Config: `commands.transmit.opts.workspace`

> Type: `int, string, enum(select, first)`

> Default: `first`

# 8. - COMMAND: `setup` - Setup the tracker

Setup the default toggl and redmine connection.

# 9. - COMMAND: `transmit` - Transmit all trackings from toggl to redmine

Transmit all trackings from toggl to redmine, in a givin time range.

## 9.1. - OPTION: `--from <moment>` - Range start

Define the startpoint of the transmit range.

> Config:  `commands.transmit.opts.from`

> Type: `string`

> Default: `-1 days`

## 9.2. - OPTION: `--to <moment>` - Range end

Define the endpoint of the transmit range.

> Config:  `commands.transmit.opts.to`

> Type: `string`

> Default: `now`

## 9.3. - OPTION: `--workspace <workspaceid>` - The workspice ID

Define the workspace. 

Use `select` to interactive select the workspace ID. If only 1 workspace is defined in toggl, select it.
Use `first` to select always the first workspace defined in toggl.
Use `<number>` to select a workspace by its ID.

> Config: `commands.transmit.opts.workspace`

> Type: `int, string, enum(select, first)`

> Default: `first`

## 9.4. - OPTION: `--dry` - Execute the command without transmit

Test command to show what will be transmitted.

## 9.5. - OPTION: `--round <minutes>` - Round to minutes

Round the transmit values to a givin minutes up.

_If used with `--merge` the round will perform after the merge_

> Config:  `commands.transmit.opts.round`

> Type: `boolean, int`

> Default: `false`

## 9.6. - OPTION: `--merge` - Merge the trackings per day

Merge trackings by id, only per day.

> Config:  `commands.transmit.opts.merge`

> Type: `boolean`

> Default: `false`

## 9.7. - OPTION: `-f, --force <forceoption>` - Force the execution

Force the execution to `skip` or `ignore` all undefined trackings.

Use `--force skip (-f s)` to skip all trackings that have no ticket IDs.

Use `--force ignore (-f i)` to ignore all trackings that have no ticket IDs.

> Config:  `commands.transmit.opts.force`

> Type: `boolean, string, enum(skip, ignore, s, i)`

> Default: `false`

## 9.8. - OPTION: `-y, --yes` - Accept the transmit

Transmit the trackings without asking.

> Config:  `commands.transmit.opts.yes`

> Type: `boolean`

> Default: `false`

# 10. - Change Config

Change the config by using the `tracker config edit` command to see the path of config file.

Please use `tracker config test` after changing the config file.

## 10.1. - Add default option for command

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