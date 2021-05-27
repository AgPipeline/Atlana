/**
 * @fileoverview Main app instance
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { Component } from 'react';
import states from './States.js';
import MainMenu from './MainMenu.js';
import AFiles from './AFiles.js';
import AWorkflow from './AWorkflow.js';
import ConfigStore from './ConfigStore.js';
import './App.css';

/**
 * Side menu items - not currently implemented
 */
var sidemenu = [
];

/**
 * The main menu
 */
var menu = [
{ 
  name: 'Data sources',
  items: [{
    name: 'Files',
    id: states.data_files
  }]
}, {
  name: 'Workflows',
  items: [{
    name: 'Image',
    id: states.workflow_image
  }]
}
];

/**
 * Implements the main application UI
 * @extends Component
 */
class App extends Component {
  /**
   * Initializes instance of class
   * @param {Object} props - the properties associated with this object
   */
  constructor(props) {
    super(props);

    this.addFile = this.addFile.bind(this);
    this.addWorkflow = this.addWorkflow.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.deleteWorkflow = this.deleteWorkflow.bind(this);
    this.getFiles = this.getFiles.bind(this);
    this.getWorkflows = this.getWorkflows.bind(this);
    this.mainMenuSelected = this.mainMenuSelected.bind(this);
    this.setMainMenu = this.setMainMenu.bind(this);
    this.updateFile = this.updateFile.bind(this);
    this.updateWorkflow = this.updateWorkflow.bind(this);

    this.state = {
      mode: states.main_menu,
    }
  }

  /**
   * Called when a new file or folder is defined
   * @param {Object} new_file_def - the definition of the new file/folder
   * @param {string} new_file_def.id - the ID of the new file/folder entry
   */
  addFile(new_file_def) {
    ConfigStore.addFile(new_file_def);
  }

  /**
   * Called when a new workflow is defined
   * @param {Object} new_workflow_def - the definition of the new workflow
   * @param {string} new_workflow_def.id - the ID of the new workflow
   */
  addWorkflow(new_workflow_def) {
    ConfigStore.addWorkflow(new_workflow_def);
  }

  /**
   * Removed the file/folder from the list by ID
   * @param {string} item_id - the ID of the item to remove
   */
  deleteFile(item_id) {
    ConfigStore.deleteFileById(item_id);
  }

  /**
   * Removed the workflow from the list by ID
   * @param {string} item_id - the ID of the item to remove
   */
  deleteWorkflow(item_id) {
    ConfigStore.deleteWorkflowById(item_id);
  }

  /**
   * Returns the list of file/folder that have been added
   * @returns {Object[]} The list of files/folders that were added
   */
  getFiles() {
    return ConfigStore.getFiles();
  }

  /**
   * Returns the list of workflows that have been added
   * @returns {Object[]} The list of workflows that were added
   */
  getWorkflows() {
    return ConfigStore.getWorkflows();
  }

  /**
   * Used to change what's displayed to the user
   * @param {string:int} menu_id - the ID of the menu item selected
   */
  mainMenuSelected(menu_id) {
    this.setState({mode: menu_id})
  }

  /**
   * Causes the main menu to display
   */
  setMainMenu() {
    this.setState({mode: states.main_menu});
  }

  /**
   * Updates an existing file/folder entry with new values
   * @param {string} old_item_id - the ID of the item to update; the updated item's ID can be the same value as this
   * @param {Object} updated_file_def - the new definition of the file/folder
   * @param {string} updated_file_def.id - the id of the new definition of the file/folder (can be the same as the old ID)
   */
  updateFile(old_item_id, updated_file_def) {
    ConfigStore.updateFile(old_item_id, updated_file_def);
  }

  /**
   * Updates a workflow entry with new values
   * @param {string} old_item_id - the ID of the entry to update; the updated entry's ID can be the same value as this
   * @param {Object} updated_workflow_def - the new definition of the workflow
   * @param {string} updated_workflow_def.id - the ID of the new definition of the workflow (can be the same as the old ID)
   */
  updateWorkflow(old_item_id, updated_workflow_def) {
    ConfigStore.updateWorkflow(old_item_id, updated_workflow_def);
  }

  /**
   * Returns the UI
   */
  render() {
    const main_menu = menu;
    // TODO: map menu to side menu when not on main page (new component?)

    return (
      <div className="app">
        <header className="app-header">
          <span id="app-header-wrapper" className="app-header-wrapper">
          </span>
        </header>
        <div id="app_name" className="app-title-text" onClick={this.setMainMenu}><img src="logo.png" alt="Atlana" /></div>
        <span id="app_body" className="body-wrapper">
          <span id="app_sidemenu" className="sidemenu-wrapper">
            {sidemenu.map((item) => {
              return (<span key={item.id} id={"sidemenu" + item.id}
                                          className="sidemenu-item" 
                                          onClick={() => {}} 
                      >{item.name}</span>);
              })
            }
          </span>
          <span id="main_area" className="main-area">
            {this.state.mode === states.main_menu && <MainMenu menu={main_menu} selected={this.mainMenuSelected} />}
            <div id="atlana_workspace">
              {this.state.mode === states.data_files && <AFiles files={this.getFiles} onAdd={this.addFile} onUpdate={this.updateFile}
                                                           onDelete={this.deleteFile} onDone={this.setMainMenu} />}
              {this.state.mode === states.workflow_image && <AWorkflow workflows={this.getWorkflows} files={this.getFiles} onAdd={this.addWorkflow}
                                                          onDelete={this.deleteWorkflow} onUpdate={this.updateWorkflow} onDone={this.setMainMenu}/>}
            </div>
          </span>
        </span>
      </div>
    );
  }
}

export default App;
