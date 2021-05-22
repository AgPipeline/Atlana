// Implementation of utility functions
import { v4 as uuidv4 } from 'uuid';

class Utils {

  static getHostOrigin(){
    return (window.location.origin)
  }

  static getUuid() {
    return uuidv4();
  }
}

export default Utils;
