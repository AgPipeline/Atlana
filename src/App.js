import { Component } from 'react';
import states from './States';
import MainMenu from './MainMenu';
import AFiles from './AFiles';
import ConfigStore from './ConfigStore';
import './App.css';

var sidemenu = [
];

var menu = [
{ name: 'Data sources',
  items: [{
    name: 'Files',
    id: states.files
  }]
}
];

class App extends Component {
  constructor(props) {
    super(props);

    this.addFile = this.addFile.bind(this);
    this.getFiles = this.getFiles.bind(this);
    this.mainMenuSelected = this.mainMenuSelected.bind(this);

    this.state = {
      mode: states.main_menu,
    }
  }

  addFile(new_file_def) {
    ConfigStore.addFile(new_file_def);
  }

  deleteFile(item_id) {
    ConfigStore.deleteItemById(item_id);
  }

  getFiles() {
    return ConfigStore.getFiles();
  }

  mainMenuSelected(menu_id) {
    this.setState({mode: menu_id})
  }

  updateFile(old_item_id, updated_file_def) {
    ConfigStore.updateFile(old_item_id, updated_file_def);
  }

  render() {
    const main_menu = menu;

    return (
      <div className="app">
        <header className="app-header">
          <span id="app-header-wrapper" className="app-header-wrapper">
          </span>
        </header>
        <span id="app_name" className="app-title-text"><img src="logo.png" alt="Atlana" /></span>
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
            {this.state.mode === states.files && <AFiles files={this.getFiles} addFile={this.addFile} updateFile={this.updateFile} deleteFile={this.deleteFile}/>}
          </span>
        </span>
      </div>
    );
  }
}

export default App;
