
class ConfigStore {

  static files = [];
  static workflows = [];

  static getFiles() {
    return ConfigStore.files;
  }

  static setFiles(new_files) {
    return ConfigStore.files = new_files;
  }

  static addFile(new_entry) {
    return ConfigStore.files.push(new_entry);
  }

  static updateFile(entry_id, updated_entry) {
    let remaining_files = ConfigStore.files.filter((item) => item.id !== entry_id);
    if (remaining_files.length < ConfigStore.files.length) {
      updated_entry['id'] = entry_id;
      remaining_files.push(updated_entry);
      ConfigStore.setFiles(remaining_files);
    }
  }

  static deleteFileById(entry_id) {
    let remaining_files = ConfigStore.files.filter((item) => item.id !== entry_id);
    if (remaining_files.length < ConfigStore.files.length) {
      ConfigStore.setFiles(remaining_files);
    }
  }

  static getWorkflows() {
    return ConfigStore.workflows;
  }

  static setWorkflows(new_workflows) {
    return ConfigStore.workflows = new_workflows;
  }

  static addWorkflow(new_entry) {
    return ConfigStore.workflows.push(new_entry);
  }

  static updateWorkflow(entry_id, updated_entry) {
    let remaining_workflows = ConfigStore.workflows.filter((item) => item.id !== entry_id);
    if (remaining_workflows.length < ConfigStore.workflows.length) {
      updated_entry['id'] = entry_id;
      remaining_workflows.push(updated_entry);
      ConfigStore.setFiles(remaining_workflows);
    }
  }

  static deleteWorkflowById(entry_id) {
    let remaining_workflows= ConfigStore.workflows.filter((item) => item.id !== entry_id);
    if (remaining_workflows.length < ConfigStore.workflows.length) {
      ConfigStore.setFiles(remaining_workflows);
    }
  }

}

export default ConfigStore;