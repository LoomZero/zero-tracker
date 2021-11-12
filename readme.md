- [1. - Install](#1---install)
  - [1.1. - WARNING: Please uninstall old tracker](#11---warning-please-uninstall-old-tracker)
- [2. - Update](#2---update)
- [3. - Add Redmine Connection](#3---add-redmine-connection)
  - [3.1. - Add another Redmine Connection via project](#31---add-another-redmine-connection-via-project)

# 1. - Install

```shell
npm install -g https://github.com/LoomZero/zero-tracker.git
```

## 1.1. - WARNING: Please uninstall old tracker 

```shell
cd ~/Custom/node/tracker
npm unlink
cd ..
rm -rf tracker
```

# 2. - Update

```shell
npm update -g zero-tracker
```

# 3. - Add Redmine Connection

```shell
tracker redmine add
```

## 3.1. - Add another Redmine Connection via project

- Create a project in toggl https://track.toggl.com/projects
- Use `tracker redmine add` if you have already a fallback connection choose your project
- Fill in all api parameters
- Add project to trackings and use `tracker transmit`