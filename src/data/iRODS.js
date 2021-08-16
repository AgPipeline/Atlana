/**
 * @fileoverview iRODS data browsing
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import IData from './IData';
import Utils from '../Utils';

/**
 * Browses an iRODS file system
 * @extends IData
 */
class iRODS extends IData {

  /**
   * Return information on this interface
   * @returns {IData~FileStoreInformation}
   * @override
   */
  initialize() {
    return ({
      name: 'iRODS files',
      authentication: true,
      summary: 'Browse iRODS folders and files',
      description: 'Connect to iRODS and browse the folders and files stored there.',
      filtering: IData.filtering.normal
    });
  }

  /*
   * Return authentication reqirements
   * @returns {Object[]} The list of authentication information needed
   * @override
   */
  authentication() {
    // Need host name, port, user name, zone, and password
    return ([{
        type: IData.auth_type.UI,
        name: 'host',
        prompt: 'Host name',
        default: 'data.cyverse.org',
        style: IData.auth_ui_type.plain
      }, {
        type: IData.auth_type.UI,
        name: 'port',
        prompt: 'Host port number',
        style: IData.auth_ui_type.plain,
        default: '1247',
        verification: '[0-9]*'
      }, {
        type: IData.auth_type.UI,
        name: 'zone',
        prompt: 'iRODS zone',
        default: 'iplant',
        style: IData.auth_ui_type.plain,
      }, {
        type: IData.auth_type.UI,
        name: 'user',
        prompt: 'User name',
        style: IData.auth_ui_type.plain,
      }, {
        type: IData.auth_type.UI,
        name: 'password',
        prompt: 'User password',
        style: IData.auth_ui_type.password,
      }]);
  }

  /**
   * Attempt to connect to iRODS
   * @param {Object} auth_info - the authentification information
   * @param success_cb - the callback for a successful connection
   * @param failure_cb - the callback for a failed connection
   * @override
   */
  connect(auth_info, success_cb, failure_cb) {
    const uri = Utils.getHostOrigin().concat('/irods/connect');

    const form_data = new FormData();

    this.authentication().every((item) => {
      if (auth_info.hasOwnProperty(item.name)) {
        form_data.append(item.name, auth_info[item.name]);
      }
      return true;
    });

    try {
      fetch(uri, {
        method: 'POST',
        credentials: 'include',
        body: form_data
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText;})
      .then(success => success_cb(success))
      .catch(error => failure_cb(error));

    } catch (err) {
      console.log("iRODS connect exception", err);
      throw err;
    }
  }

  /**
   * Get the folder contents of the specified path
   * @param {string} path - the path to fetch the contents of
   * @param {string|null} filter - a filter to apply to the folder ccontents
   * @param success_cb - the callback for a successful listing
   * @param failure_cb - the callback for a failed listing
   * @override
   */
  listFolder(path, filter, success_cb, failure_cb) {
    let uri = Utils.getHostOrigin().concat('/irods/files');

    uri += '?' + encodeURIComponent('path') + '=' + encodeURIComponent(path);
    uri += '&' + encodeURIComponent('filter') + '=' + encodeURIComponent(filter);

    try {
      fetch(uri, {
        method: 'GET',
        credentials: 'include',
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText;})
      .then(success => success_cb(success))
      .catch(error => failure_cb(error));

    } catch (err) {
      console.log("iRODS listFolder exception", err);
      throw err;
    }
  }
}

export default iRODS;
