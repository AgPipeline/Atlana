// Server-side data browsing
import IData from '/data/IData'
import Utils from './Utils'

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
    const uri = Utils.getHostOrigin().concat('/server/files');

    fetch(uri, {
      method: 'GET',
      body: JSON.stringify({path, filter}),
      }
    )
    .then(response => response.json())
    .then(success => {success_cb(success)})
    .catch(error => {failure_cb(error);});
  }
}

export default Server;
