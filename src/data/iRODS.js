// Server-side data browsing
import IData from './IData';
import Utils from '../Utils';

class iRODS extends IData {

  // Return information on this interface
  initialize() {
    return ({
      name: 'iRODS files',
      authentication: true,
      summary: 'Browse iRODS folders and files',
      description: 'Connect to iRODS and browse the folders and files stored there.',
      filtering: IData.filtering.normal
    });
  }

  // Return authentication reqirements
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

  // Attempt to connect to iRODS
  connect(auth_info, success_cb, failure_cb) {
    console.log("CONNECT");
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
        body: form_data
        }
      )
      .then(response => response.json())
      .then(success => success_cb(success))
      .catch(error => failure_cb(error));

    } catch (err) {
      console.log("iRODS connect exception", err);
      throw err;
    }
  }

  // Get the folder contents of the specified path
  listFolder(path, filter, success_cb, failure_cb) {
    console.log("LIST");
    let uri = Utils.getHostOrigin().concat('/irods/files');

    uri += '?' + encodeURIComponent('path') + '=' + encodeURIComponent(path);
    uri += '&' + encodeURIComponent('filter') + '=' + encodeURIComponent(filter);

    try {
      fetch(uri, {
        method: 'GET',
        }
      )
      .then(response => response.json())
      .then(success => success_cb(success))
      .catch(error => failure_cb(error));

    } catch (err) {
      console.log("iRODS listFolder exception", err);
      throw err;
    }
  }
}

export default iRODS;
