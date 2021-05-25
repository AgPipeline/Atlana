/**
 * @fileoverview Server-side data browsing
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import IData from './IData';
import Utils from '../Utils';

/**
 * Browses an server-side file system
 * @extends IData
 */
class Server extends IData {

  /**
   * Return information on this interface
   * @returns {IData~FileStoreInformation}
   * @override
   */
  initialize() {
    return ({
      name: 'Server files',
      authentication: false,
      summary: 'Browse server folders and files',
      description: 'Browse the server-side folders and files that are available.',
      filtering: IData.filtering.normal
    });
  }

  /*
   * Return authentication reqirements
   * @returns {Object[]} The list of authentication information needed (returns an empty array)
   * @override
   */
  authentication() {
    return ([]);
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
    let uri = Utils.getHostOrigin().concat('/server/files');

    uri += '?' + encodeURIComponent('path') + '=' + encodeURIComponent(path);
    uri += '&' + encodeURIComponent('filter') + '=' + encodeURIComponent(filter);

    try {
      fetch(uri, {
        method: 'GET',
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText;})
      .then(success => success_cb(success))
      .catch(error => failure_cb(error));

    } catch (err) {
      console.log("SERVER exception", err);
      throw err;
    }
  }
}

export default Server;
