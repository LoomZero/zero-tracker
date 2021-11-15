- [1. - Install](#1---install)
  - [1.1. - WARNING: Please uninstall old tracker](#11---warning-please-uninstall-old-tracker)
- [2. - Update](#2---update)
- [3. - Uninstall](#3---uninstall)
- [4. - Add Redmine Connection](#4---add-redmine-connection)
  - [4.1. - Add another Redmine Connection via project](#41---add-another-redmine-connection-via-project)
- [5. - Transmit Trackings](#5---transmit-trackings)
  - [5.1. - Transmit Options](#51---transmit-options)
- [6. - Change Config](#6---change-config)
  - [6.1. - Add default option for command](#61---add-default-option-for-command)

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

# 5. - Transmit Trackings

## 5.1. - Transmit Options

# 6. - Change Config

## 6.1. - Add default option for command