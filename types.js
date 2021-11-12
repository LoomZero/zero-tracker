/**
 * @typedef {Object} T_TrackerOptions
 * @property {string} root
 */

/**
 * @typedef {Object} T_TogglTracking
 * @property {number} id
 * @property {string} guid
 * @property {number} wid
 * @property {number} [pid]
 * @property {boolean} billable
 * @property {string} start
 * @property {string} [stop]
 * @property {number} duration
 * @property {string} description
 * @property {string[]} [tags]
 * @property {boolean} duronly
 * @property {string} at
 * @property {number} uid
 */

/**
 * @typedef {Object} T_TogglWorkspace
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} T_TogglTag
 * @property {number} id
 * @property {number} wid
 * @property {string} name
 * @property {string} [at]
 */

/**
 * @typedef {Object} T_TogglProject
 * @property {number} id
 * @property {number} wid
 * @property {string} name
 */

/**
 * @typedef {Object} T_RedmineIssue
 * @property {number} id
 * @property {number} project.id
 * @property {number} project.name
 * @property {string} subject
 * @property {string} description
 */

/**
 * @callback C_InputValidate
 * @param {string} answer
 * @returns {(string|null)}
 */

module.exports = {};