// Heirarchical file browsing definition interface
import iRODS from './data/iRODS';
import Server from './data/Server';

// Different file implementations
var file_interface_types = [
{
  name: 'iRODS',
  prompt: 'iRODS Definition',
  id: 2,
  create: () => {return new iRODS();}
}, {
  name: 'Server side',
  prompt: 'Server-side Definition',
  id: 1,
  create: () => {return new Server();}
}
];

class FileInterfaces {

  static getFileInterfaceTypes() {
    return file_interface_types;
  }

  static findById(interface_id) {
    return FileInterfaces.getFileInterfaceTypes().find(item => '' + item.id === '' + interface_id);
  }

  static getInterface(interface_id) {
    const found = FileInterfaces.findById(interface_id);
    if (found) {
      return found.create();
    }

    return null;
  }
}


export default FileInterfaces;