/**
 * @fileoverview Provides access to configured remote server information and instances
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import iRODS from './data/iRODS';
import Server from './data/Server';

/**
 * The definition of a file type interface object
 * @typedef {Object} FileInterfaceType - an instance of a remote server type definition
 * @property {string} FileInterfaceType.name - the name of the remote server type
 * @property {string} FileInterfaceType.prompt - the UI prompt associated with the remote server type
 * @property {int|string} FileInterfaceType.id - the ID of this remote server type
 */

/**
 * Different file access implementations
 */
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

/**
 * Returns known file interfaces
 */
class FileInterfaces {

  /**
   * Returns the different types of configured file interfaces
   * @returns {FileInterfaceType[]} 
   */
  static getFileInterfaceTypes() {
    return file_interface_types.map((item) => {
              let new_item = Object.assign({}, item);
              delete new_item.create;
              return new_item;
            }
    );
  }

  /**
   * Returns the found interface
   * @returns {FileInterfaceType} the found instance
   */
  static findById(interface_id) {
    return FileInterfaces.getFileInterfaceTypes().find(item => '' + item.id === '' + interface_id);
  }

  /**
   * Returns a new instance of the interface
   */
  static getInterface(interface_id) {
    const found = file_interface_types.find((item) => '' + item.id === '' + interface_id);
    if (found) {
      return found.create();
    }

    return null;
  }
}


export default FileInterfaces;