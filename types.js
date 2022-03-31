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
 * @callback C_InputValidate
 * @param {string} answer
 * @returns {(string|null)}
 */

/**
 * @typedef {Object} T_RedmineID
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {Object} T_RedmineStatus
 * @property {number} id
 * @property {string} name
 * @property {boolean} [is_closed]
 */

/**
 * @typedef {Object} T_RedmineProject
 * @property {number} id
 * @property {string} name
 * @property {string} identifier
 * @property {string} description
 * @property {T_RedmineID} [parent]
 * @property {number} status
 * @property {string} created_on
 * @property {string} updated_on
 * @property {T_RedmineProject[]} [children]
 */

/**
 * @typedef {Object} T_RedmineJournalDetail
 * @property {string} name
 * @property {string} new_value
 * @property {string} old_value
 * @property {string} property
 */

/**
 * @typedef {Object} T_RedmineJournal
 * @property {string} created_on
 * @property {T_RedmineJournalDetail[]} details
 * @property {number} id
 * @property {string} notes
 * @property {T_RedmineID} user 
 */

/**
 * @typedef {Object} T_RedmineIssue
 * @property {number} id
 * @property {T_RedmineID} project
 * @property {T_RedmineID} status
 * @property {T_RedmineID} [assigned_to]
 * @property {T_RedmineID} author
 * @property {string} subject
 * @property {string} description
 * @property {T_RedmineJournal[]} [journals] only available when option {include: 'journals'}
 */

/**
 * @typedef {Object} T_RedmineUpdateIssue
 * @property {(T_RedmineID|number|string)} [status] alias for status_id
 * @property {number} [status_id]
 * @property {(T_RedmineID|number|string)} [assigned] alias for assigned_to_id
 * @property {number} [assigned_to_id]
 * @property {string} [subject]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} T_RedminePagingOptions
 * @property {number} [offset]
 * @property {number} [limit]
 */

/**
 * @typedef {Object} T_RedmineMembership
 * @property {number} id
 * @property {T_RedmineID} project
 * @property {T_RedmineID} [user]
 * @property {T_RedmineID} [group]
 * @property {T_RedmineID[]} roles
 */

/**
 * @typedef {Object} T_RedmineError
 * @property {number} ErrorCode
 * @property {string} Message
 */

/**
 * @typedef {Object} T_RedmineIssueFilter
 * @property {(string|number|string[]|number[])} [issue] alias for issue_id
 * @property {string} [issue_id] get issue with the given id or multiple issues by id using ',' to separate id
 * @property {(string|T_RedmineID)} [project] alias for project_id
 * @property {string} [project_id] get issues from the project with the given id (a numeric value, not a project identifier)
 * @property {number} [tracker_id] get issues from the tracker with the given id
 * @property {(number|string)} [status_id] get issues with the given status id only. Possible values: open, closed, * to get open and closed issues, status id
 * @property {(number|string)} [assigned_to_id] get issues which are assigned to the given user id. me can be used instead an ID to fetch all issues from the logged in user (via API key or HTTP auth)
 * @property {number} [parent_id] get issues whose parent issue is given id.
 * @property {number} [limit] number of issues per page
 * @property {number} [offset]
 * @property {string} [sort] column to sort with. Append :desc to invert the order. Options: updated_on, ...
 * @property {string} [subject] search for the subject. Use the prefix '~' to search with containing string.
 */

/**
 * @typedef {Object} T_ConnectorRequest
 * @property {string} func
 * @property {any[]} args
 */

/**
 * @typedef {Object} T_RedmineConnectorResponse
 * @property {number} limit
 * @property {number} offset
 * @property {number} total_count
 */

module.exports = {};