
class ConfigStore {

  static files = [];

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
    let remaining_files = ConfigStore.files.filter((item) => {console.log(item.id,'===',entry_id,item.id !== entry_id);return item.id !== entry_id});
    if (remaining_files.length < ConfigStore.files.length) {
      updated_entry['id'] = entry_id;
      remaining_files.push(updated_entry);
      ConfigStore.setFiles(remaining_files);
    }
  }

  static deleteItemById(entry_id) {
    let remaining_files = ConfigStore.files.filter((item) => {console.log(item.id,'===',entry_id,item.id !== entry_id);return item.id !== entry_id});
    if (remaining_files.length < ConfigStore.files.length) {
      ConfigStore.setFiles(remaining_files);
    }
  }

}

export default ConfigStore;