/**
 * @fileoverview Configuration storage interface
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */

/**
  * Class for storing configurations
  */
class ConfigStore {

  /**
   * The array of configured files
   */
  static files = [];

  /**
   * The array of configured workflows
   */
  static workflows = [];

  /**
   * Returns the array of known file configurations
   */
  static getFiles() {
    return ConfigStore.files;
  }

  /**
   * Replaces the configured files array
   * @param {Object[]} new_file - the array of file configurations to store
   */
  static setFiles(new_files) {
    return ConfigStore.files = new_files;
  }

  /**
   * Adds a new file configuration entry to the list of file configurations
   * @param {Object} new_entry - the new file entry to add
   * @param {int | string} new_entry.id - the ID of the new entry
   */
  static addFile(new_entry) {
    return ConfigStore.files.push(new_entry);
  }

  /**
   * Updates an existing file configuration entry with new values
   * @param {int | string} entry_id - the ID of the entry to replace
   * @param {Object} updated_entry - the new entry for that ID. The caller needs to maintain the ID between entries as desired
   * @param {int | string} updated_entry.id - the ID of the updated entry
   */
  static updateFile(entry_id, updated_entry) {
    let remaining_files = ConfigStore.files.filter((item) => item.id !== entry_id);
    if (remaining_files.length < ConfigStore.files.length) {
      updated_entry['id'] = entry_id;
      remaining_files.push(updated_entry);
      ConfigStore.setFiles(remaining_files);
    }
  }

  /**
   * Deletes a file configuration entry by its ID
   * @param {int | string} entry_id - the ID of the entry to delete
   */
  static deleteFileById(entry_id) {
    let remaining_files = ConfigStore.files.filter((item) => item.id !== entry_id);
    if (remaining_files.length < ConfigStore.files.length) {
      ConfigStore.setFiles(remaining_files);
    }
  }

  /**
   * Returns the list of configured workflows
   */
  static getWorkflows() {
    return ConfigStore.workflows;
  }

  /**
   * Replaces the array of configured workflows
   * @param {Obejct[]} new_workflows - the array of workflows to save
   */
  static setWorkflows(new_workflows) {
    return ConfigStore.workflows = new_workflows;
  }

  /**
   * Adds a new configured workflow to the array
   * @param {Object} new_entry - the new entry to add
   * @param {int | string} new_entry.id - the ID of the new entry
   */
  static addWorkflow(new_entry) {
    return ConfigStore.workflows.push(new_entry);
  }

  /**
   * Updates an existing configured workflow
   * @param {int | string} entry_id - the ID of the entry to update
   * @param {Object} updated_entry - the updated configured workflow entry. The called needs to maintain the ID between entries as desired
   * @param {int | string} updated_entry.id - the ID of the updated entry
   */
  static updateWorkflow(entry_id, updated_entry) {
    let remaining_workflows = ConfigStore.workflows.filter((item) => item.id !== entry_id);
    if (remaining_workflows.length < ConfigStore.workflows.length) {
      updated_entry['id'] = entry_id;
      remaining_workflows.push(updated_entry);
      ConfigStore.setWorkflows(remaining_workflows);
    }
  }

  /**
   * Deletes the entry from the array of configured workflows by ID
   * @param {int | string} entry_id - the ID of the configured workflow entry to delete
   */
  static deleteWorkflowById(entry_id) {
    let remaining_workflows= ConfigStore.workflows.filter((item) => item.id !== entry_id);
    if (remaining_workflows.length < ConfigStore.workflows.length) {
      ConfigStore.setWorkflows(remaining_workflows);
    }
  }

}

export default ConfigStore;