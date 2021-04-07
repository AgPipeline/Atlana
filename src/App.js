import { Component } from 'react';
import states from './States';
import MainMenu from './MainMenu';
import AFiles from './AFiles';
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

    this.main_menu_selected = this.main_menu_selected.bind(this);

    this.state = {
      mode: states.main_menu,
    }
  }

  main_menu_selected(menu_id) {
    this.setState({mode: menu_id})
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
            {this.state.mode === states.main_menu && <MainMenu menu={main_menu} selected={this.main_menu_selected} />}
            {this.state.mode === states.files && <AFiles />}
          </span>
        </span>
      </div>
    );
  }
}

export default App;
