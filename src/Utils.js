// Implementation of utility functions
import { v4 as uuidv4 } from 'uuid';

class Utils {

  static getHostOrigin(){
    return (window.location.origin)
    //return 'http://localhost:5000';
  }

  static getUuid() {
    return uuidv4();
  }
}

export default Utils;
