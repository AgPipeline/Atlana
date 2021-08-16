/**
 * @fileoverview Main menu implementation
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import './MainMenu.css'

/**
 * Implementation of the main menu
 * @extends Component
 */
class MainMenu extends Component {
  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.menuClick = this.menuClick.bind(this);
    this.renderSubmenu = this.renderSubmenu.bind(this);
    this.renderMenuItem = this.renderMenuItem.bind(this);

    const cur_menu = props.menu ? props.menu : [];
    const cur_callback = props.selected ? props.selected : () => {};

    this.state = {
      menu: cur_menu,
      callback: cur_callback
    }
  }

  /**
   * Called when a menu item is clicked
   * @param {Object} menu_value - the value associated with the menu item
   */
  menuClick(menu_value) {
    if (this.state.callback) {
      this.state.callback(menu_value);
    }
  }

  /**
   * Returns the UI for a submenu item
   * @param {string} menu_path - the path to the menu the submenu is a part of
   * @param {Object} submenu_item - the submenu item to generaate the UI for
   * @param {string} submenu_item.name - the name of the submenu item
   * @param {string} submenu_item.id - the ID of the submenu item
   */
  renderSubmenu(menu_path, submenu_item) {
    const submenu_path = menu_path + '/' + submenu_item.name;
    const submenu_id = submenu_item.id ? submenu_item.id : null;
    return (
      <div id={'sub_menu_' + submenu_item.name} key={'submenu_' + submenu_path} className="main-menu-sub-item-wrapper" onClick={() => this.menuClick(submenu_id)}>
        <div id={'sub_menu_text_' + submenu_item.name} key={submenu_path} className="main-menu-sub-item">{submenu_item.name}</div>
      </div>
    );
  }

  /**
   * Generates the UI for the menu item and it's submenus
   * @param {Object} menu_item - the menu item to render
   * @param {Object[]} menu_item.items - the list of sub-menu items to render
   * @param {string} menu__item.name - the name of this menu item
   */
  renderMenuItem(menu_item) {
    const submenu = menu_item.items ? menu_item.items : [];

    return (
      <div key={'menu_wrap_' + menu_item.name}>
        <div id={'menu_' + menu_item.name} key={'menu_' + menu_item.name} className="main-menu-item-wrapper">
          <div id={'menu_text_' + menu_item.name} key={menu_item.name} className="main-menu-item">{menu_item.name}</div>
        </div>
        {submenu.map((item) => this.renderSubmenu(menu_item.name, item))}
      </div>
    );
  }

  /**
   * Returns the UI for the main menu
   */
  render() {
    if (!this.props.menu || !this.props.selected) {
      return null;
    }
    return (
      <div id='main_menu' className='main-menu-wrapper' >
        {this.state.menu.map(this.renderMenuItem)}
      </div>
    );
  }
}

export default MainMenu;
