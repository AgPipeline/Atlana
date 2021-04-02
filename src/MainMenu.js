import {Component} from 'react';
import './MainMenu.css'

class MainMenu extends Component {
  constructor(props) {
    super(props);

    const cur_menu = props.menu ? props.menu : [];
    const cur_callback = props.selected ? props.selected : () => {};

    this.render_submenu = this.render_submenu.bind(this);
    this.render_menu_item = this.render_menu_item.bind(this);

    this.state = {
      menu: cur_menu,
      callback: cur_callback
    }
  }

  render_submenu(menu_path, submenu_item) {
    return (
      <div id={'sub_menu_' + submenu_item.name} key={menu_path + '/' + submenu_item.name} class="main-menu-sub-item-wrapper">
        <div id={'sub_menu_text_' + submenu_item.name} class="main-menu-sub-item">{submenu_item.name}</div>
      </div>
    );
  }

  render_menu_item(menu_item) {
    const submenu = menu_item.items ? menu_item.items : [];

    return (
      <>
        <div id={'menu_' + menu_item.name} key={menu_item.name} class="main-menu-item-wrapper">
          <div id={'menu_text_' + menu_item.name} class="main-menu-item">{menu_item.name}</div>
        </div>
        {submenu.map((item) => this.render_submenu(menu_item.name, item))}
      </>
    );
  }

  render() {
    if (!this.props.menu || !this.props.selected) {
      return null;
    }
    return (
      <div id='main_menu' class='main-menu-wrapper' >
        {this.state.menu.map(this.render_menu_item)}
      </div>
    );
  }
}

export default MainMenu;
