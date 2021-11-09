module.exports = class Reflection {

  static getFunctionNameFromKey(key, seperator = '.', first = false) {
    const splits = key.split(seperator);

    for (let i = (first ? 0 : 1); i < splits.length; i++) {
      splits[i] = splits[i].charAt(0).toUpperCase() + splits[i].slice(1);
    }
    return splits.join('');
  }

  /**
   * @param {function} func
   * @returns {string}
   */
  static getFunctionDescription(func) {
    return func.name + '(' + this.getFunctionArgs(func).join(', ') + ')';
  }

  /**
   * @param {function} func
   * @returns {string[]}
   */
  static getFunctionArgs(func) {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

    return (result === null ? [] : result);
  }

  /**
   * @param {(Object|typeof Object)} struct 
   * @param {string} instanceAdd 
   * @param {string} staticAdd 
   * @returns {string}
   */
  static getClassDescription(struct, instanceAdd = '', staticAdd = '') {
    return struct.constructor !== Function ? struct.constructor.name + instanceAdd : struct.name + staticAdd;
  }

  /**
   * @param {object} data 
   * @param {string} name 
   * @returns {boolean}
   */
  static hasDeep(data, name, isDefined = null) {
    if (isDefined === null) isDefined = (value) => value !== null;
    const value = this.getDeep(data, name, null);
    return isDefined(value);
  }

  /**
   * @param {Object} data
   * @param {string} name
   * @param {any} fallback
   * @returns {any}
   */
  static getDeep(data, name, fallback = null) {
    const splits = name.split('.');

    for (const split of splits) {
      if (data === undefined) return fallback;
      data = data[split];
    }
    return (data === undefined ? fallback : data);
  }

  /**
   * @param {Object} data
   * @param {string} name
   * @param {any} value
   */
  static setDeep(data, name, value) {
    const splits = name.split('.');
    const last = splits.pop();

    for (const split of splits) {
      if (data[split] === undefined) data[split] = {};
      data = data[split];
    }
    data[last] = value;
  }

  /**
   * @param {Object} data
   * @param {string} name
   */
  static removeDeep(data, name) {
    const splits = name.split('.');
    const last = splits.pop();

    for (const split of splits) {
      if (data[split] === undefined) data[split] = {};
      data = data[split];
    }
    delete data[last];
  }

  /**
   * @param {Object} data
   * @param {string} name
   */
  static removeDeepRecursive(data, name) {
    const original = data;
    const splits = name.split('.');
    const last = splits.pop();

    for (const split of splits) {
      if (data[split] === undefined) data[split] = {};
      data = data[split];
    }
    delete data[last];

    if (Object.keys(data).length === 0 && splits.length) {
      this.removeDeepRecursive(original, splits.join('.'));
    }
  }

  static isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  static merge(...objects) {
    const newObject = {};
    
    for (const object of objects) {
      for (const field in object) {
        newObject[field] = object[field];
      }
    }
    return newObject;
  }

  /**
   * Merge only if already exist in valid object.
   * 
   * @param {Object} valid 
   * @param {Function} cb 
   * @param  {...any} objects 
   * @returns 
   */
  static mergeValid(valid, cb = null, ...objects) {
    const newObject = {};

    for (const field in valid) {
      newObject[field] = valid[field];
    }
    
    for (const object of objects) {
      for (const field in object) {
        if (newObject[field] === undefined) {
          if (typeof cb === 'function') cb(valid, object, field);
        } else {
          newObject[field] = object[field];
        }
      }
    }
    return newObject;
  }

  static mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.mergeDeep(target, ...sources);
  }

  /**
   * @param {Object} data
   * @param {string} name
   * @param {any} value
   * @returns {any}
   */
  static search(data, name, value) {
    for (const index in data) {
      if (data[index][name] === value) {
        return data[index];
      }
    }
    return null;
  }

  /**
   * @param {string} message
   * @param {(Array|Object)} placeholders
   * @param {string|import('../../defs').Inserter} inserter
   * @returns {string}
   */
  static replaceMessage(message, placeholders, inserter = '"') {
    if (Array.isArray(placeholders)) {
      return this.replaceArray(message, placeholders, inserter);
    } else {
      return this.replaceObject(message, placeholders, inserter);
    }
  }

  /**
   * @param {string} message
   * @param {Array} placeholders
   * @param {string|import('../../defs').Inserter} inserter
   * @returns {string}
   */
  static replaceArray(message, placeholders = [], inserter = '"') {
    let doInserter = inserter;

    if (typeof doInserter !== 'function') {
      doInserter = (v) => {
        if (typeof inserter === 'string') {
          return inserter + v + inserter;
        }
        return v;
      };
    }

    for (const index in placeholders) {
      message = message.replace(new RegExp('\\[' + index + '\\]', 'g'), doInserter(placeholders[index]));
    }
    return message;
  }

  /**
   * @param {string} message
   * @param {Object} placeholders
   * @param {string|import('../../defs').Inserter} inserter
   * @returns {string}
   */
  static replaceObject(message, placeholders = {}, inserter = '"') {
    let doInserter = inserter;

    if (typeof doInserter !== 'function') {
      doInserter = (v) => {
        if (typeof inserter === 'string') {
          return inserter + v + inserter;
        }
        return v;
      };
    }

    for (const placeholder in placeholders) {
      message = message.replace(new RegExp(placeholder, 'g'), doInserter(placeholders[placeholder]));
    }
    return message;
  }

  static replaceCallback(message, callback) {
    message = message.replace(new RegExp('(\\{[^}]*\\})', 'g'), (match, ...info) => {
      return callback(match.substring(1, match.length - 1), message, info);
    });
    return message;
  }

  /**
   * @param {string} value
   * @returns {*}
   */
  static parseValue(value) {
    if (value === null || value === undefined) return null;
    try {
      return JSON.parse(value);
    } catch (e) {}
    if (value + '' === parseInt(value) + '') {
      return parseInt(value);
    }
    if (value + '' === parseFloat(value) + '') {
      return parseFloat(value);
    }
    return value;
  }

}