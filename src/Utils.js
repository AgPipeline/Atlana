/**
 * @fileoverview Implementation of utility functions
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { v4 as uuidv4 } from 'uuid';

/* BE SURE TO UPDATE ProductionUtils.js TO HAVE CHANGES REFLECTED IN A PRODUCTION ENVIRONMENT */
/**
 * Class implementing utility functions
 */
class Utils {

  /**
   * Returns the value to use as the host origin
   * @returns {string} the host origin string
   */
  static getHostOrigin(){
    return 'http://localhost:5000';
  }

  /**
   * Generates a UUID
   * @returns {string} returns the generated UUID
   */
  static getUuid() {
    return uuidv4();
  }
}

export default Utils;
