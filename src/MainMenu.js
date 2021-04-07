// Main menu implementation
import {Component} from 'react';
import './MainMenu.css'

class MainMenu extends Component {
  constructor(props) {
    super(props);

    const cur_menu = props.menu ? props.menu : [];
    const cur_callback = props.selected ? props.selected : () => {};

    this.menu_click = this.menu_click.bind(this);
    this.render_submenu = this.render_submenu.bind(this);
    this.render_menu_item = this.render_menu_item.bind(this);

    this.state = {
      menu: cur_menu,
      callback: cur_callback
    }
  }

  menu_click(menu_value) {
    if (this.state.callback) {
      this.state.callback(menu_value);
    }
  }

  render_submenu(menu_path, submenu_item) {
    const submenu_path = menu_path + '/' + submenu_item.name;
    const submenu_value = submenu_item.hasOwnProperty('id') ? submenu_item.id : null;
    return (
      <div id={'sub_menu_' + submenu_item.name} key={'submenu_' + submenu_path} className="main-menu-sub-item-wrapper" onClick={() => this.menu_click(submenu_value)}>
        <div id={'sub_menu_text_' + submenu_item.name} key={submenu_path} className="main-menu-sub-item">{submenu_item.name}</div>
      </div>
    );
  }

  render_menu_item(menu_item) {
    const submenu = menu_item.items ? menu_item.items : [];

    return (
      <div key={'menu_wrap_' + menu_item.name}>
        <div id={'menu_' + menu_item.name} key={'menu_' + menu_item.name} className="main-menu-item-wrapper">
          <div id={'menu_text_' + menu_item.name} key={menu_item.name} className="main-menu-item">{menu_item.name}</div>
        </div>
        {submenu.map((item) => this.render_submenu(menu_item.name, item))}
      </div>
    );
  }

  render() {
    if (!this.props.menu || !this.props.selected) {
      return null;
    }
    return (
      <div id='main_menu' className='main-menu-wrapper' >
        {this.state.menu.map(this.render_menu_item)}
      </div>
    );
  }
}

export default MainMenu;
