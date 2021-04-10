// Server-side data browsing
import IData from '/data/IData';

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
        type: iData.auth_type.UI,
        name: 'host',
        prompt: 'Host name',
        type: iData.auth_ui_type.plain
      }, {
        type: iData.auth_type.UI,
        name: 'port',
        prompt: 'Host port number',
        type: iData.auth_ui_type.plain,
        verification: '[0-9]*'
      }, {
        type: iData.auth_type.UI,
        name: 'zone',
        prompt: 'iRODS zone'
        type: iData.auth_ui_type.plain,
      }, {
        type: iData.auth_type.UI,
        name: 'user',
        prompt: 'User name'
        type: iData.auth_ui_type.plain,
      }, {
        type: iData.auth_type.UI,
        name: 'password',
        prompt: 'User password',
        type: iData.auth_ui_type.password,
      }]);
  }

  // Attempt to connect to iRODS
  connect(auth_info) {
  }

  // Get the folder contents of the specified path
  listFolder(path, filter, success_cb, failure_cb) {
  }
}

export default Server;
