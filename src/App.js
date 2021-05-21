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
 * @type {Object.<id: string, name: string}[]
 */
var sidemenu = [
];

/**
 * The main menu
 * @type {Object.<name: string, items{Object.<name: string, id}[]}[]
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
   * @param {Object.<id, ...>} new_file_def - the definition of the new file object
   */
  addFile(new_file_def) {
    ConfigStore.addFile(new_file_def);
  }

  addWorkflow(new_workflow_def) {
    ConfigStore.addWorkflow(new_workflow_def);
  }

  deleteFile(item_id) {
    ConfigStore.deleteFileById(item_id);
  }

  deleteWorkflow(item_id) {
    ConfigStore.deleteWorkflowById(item_id);
  }

  getFiles() {
    return ConfigStore.getFiles();
  }

  getWorkflows() {
    return ConfigStore.getWorkflows();
  }

  mainMenuSelected(menu_id) {
    this.setState({mode: menu_id})
  }

  setMainMenu() {
    this.setState({mode: states.main_menu});
  }

  updateFile(old_item_id, updated_file_def) {
    ConfigStore.updateFile(old_item_id, updated_file_def);
  }

  updateWorkflow(old_item_id, updated_workflow_def) {
    ConfigStore.updateWorkflow(old_item_id, updated_workflow_def);
  }

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
