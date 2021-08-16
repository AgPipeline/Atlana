/**
 * @fileoverview Base class for data definition and access
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */

/**
 * Interface class for remote data access
 */
class IData {

/**
 * Information on remote file store providers
 * @typedef {Object} IData~FileStoreInformation
 * @property {string} name - the name of the provider
 * @property {bool} authentication - set to true if authentication information is needed
 * @property {string} summary - short summary describing provider
 * @property {string} description - long description of provider
 * @property {int} filtering - type of file name filtering supported by provider
 */

  /**
   * Flag for indicating what type of file name filter is being passed
   * @static
   */
  static filtering = {
    normal: 0,
    regular_expression: 1,
  };

  /**
   * Authentication field types
   * @static
   */
  static auth_type = {
    UI: 'UI', // User provided
    URL: 'URL' // URL provided
  };

  /**
   * User interface authentication types
   * @static
   */
  static auth_ui_type = {
    plain: 0, // Plain text
    secret: 1, // Hidden, but not a password
    password: 2, // A password
  };

  /**
   * Initialization of the instance
   * @returns {FileStoreInformation|null} the information on the remote storage
   */
  initialize() {
    return null;
  }

  /**
   * Returns the array of authentication fields needed by the remote storage
   */
  authentication() {
    return null;
  }

  /**
   * Requests a connection to  the remote server
   * @param {Object} auth_info - the authentification information
   * @param success_cb - the callback for a successful connection
   * @param failure_cb - the callback for a failed connection
   */
  connect(auth_info, success_cb, failure_cb) {
    success_cb(null);
  }

  /**
   * Returns the contents of a folder to the success_cb parameter
   * @param {string} path - the path to fetch the contents of
   * @param {string|null} filter - a filter to apply to the folder ccontents
   * @param success_cb - the callback for a successful listing
   * @param failure_cb - the callback for a failed listing
   */
  listFolder(path, filter, success_cb, failure_cb) {
    failure_cb("Not implemented");
  }
}

export default IData;
