// Server-side data browsing
import IData from './IData';
import Utils from '../Utils';

class Server extends IData {

  // Return information on this interface
  initialize() {
    return ({
      name: 'Server files',
      authentication: false,
      summary: 'Browse server folders and files',
      description: 'Browse the server-side folders and files that are available.',
      filtering: IData.filtering.normal
    });
  }

  // Return authentication reqirements
  authentication() {
    return ([]);
  }

  // Get the folder contents of the specified path
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
