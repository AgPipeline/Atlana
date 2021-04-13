//Implementation of file system interface
import { Component } from 'react';
import FileInterfaces from './FileInterfaces';
import IData from './data/IData';
import './AFilesEdit.css';

var file_display_titles = ['Name', 'Date', 'Size'];

class AFilesEdit extends Component {
  constructor(props) {
    super(props);

    this.displayContents = this.displayContents.bind(this);
    this.displayError = this.displayError.bind(this);
    this.displayFetchWait = this.displayFetchWait.bind(this);
    this.displayPathItem = this.displayPathItem.bind(this);
    this.fetchRequestCatch = this.fetchRequestCatch.bind(this);
    this.fetchRequestError = this.fetchRequestError.bind(this);
    this.fetchRequestFinish = this.fetchRequestFinish.bind(this);
    this.fetchRequestStart = this.fetchRequestStart.bind(this);
    this.generateInterfaceItem = this.generateInterfaceItem.bind(this);
    this.generateInterfaceUI = this.generateInterfaceUI.bind(this);
    this.handleDocumentKey = this.handleDocumentKey.bind(this);
    this.handleGoButton = this.handleGoButton.bind(this);
    this.handlePathKey = this.handlePathKey.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onNameUpdated = this.onNameUpdated.bind(this);
    this.onOk = this.onOk.bind(this);
    this.onPathUpdated = this.onPathUpdated.bind(this);

    this.interface = FileInterfaces.getInterface(props.source);
    this.interface_info = this.interface.initialize();

    let cur_path = this.props.path ? this.props.path : '/';
    let cur_name = this.props.edit_item ? this.props.edit_item.name : this.interface_info.name;

    this.state = {
      cur_path: cur_path,     // Current working path
      fetching: false,        // Convenience flag for UI updates
      path_contents: null,    // Folder contents
      name: cur_name,         // Working name of definition
    }
  }

  pending_fetch = null;       // Current pending request
  pending_fetch_id = 1;       // The ID of the current pending fetch
  authentication = {};        // Authentication information

  componentDidMount() {
    // Hook up key screenings
    {
      let el = document.getElementById('file_edit_path_edit');
      if (el) {
        el.addEventListener('keydown', this.handlePathKey, false);
      }

      document.addEventListener('keydown',  this.handleDocumentKey, false);
    }

    // If we are already fetching, display the waiting UI
    if (this.state.fetching) {
      let el = document.getElementById('file_edit_path_display_wait_wrapper');
      if (!el) {
        this.displayFetchWait();
      }
    } else {
      if ((!this.interface.authentication() || !this.interface.authentication().length) && this.state.cur_path) {
        this.fetchRequestStart(this.state.cur_path);
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown',  this.handleDocumentKey, false);

    let el = document.getElementById('file_edit_path_edit');
    if (el) {
      el.removeEventListener("keydown", this.handlePathKey, false);
    }
  }

  fetchRequestStart(path) {
    if (this.pending_fetch) {
      console.log("ERROR: cancel previous file fetch before begining a new one");
      alert("Unable to complete request at this time, please wait and try again");
      return;
    }

    this.setState({fetching: true});
    this.pending_fetch = new Promise((resolve, reject) => this.interface.listFolder(path, '*', resolve, reject))
      .then(folder_contents => {this.fetchRequestFinish(this.pending_fetch_id++, path, folder_contents);})
      .catch(this.fetchRequestCatch);
  }

  fetchRequestFinish(request_id, path, results) {
    console.log("fetchRequestFinish",request_id, path, results);
    // Ignore finished requests that are not us
    if (this.pending_fetch_id !== request_id + 1) {
      return;
    }

    // Remove pending status  and update state
    this.pending_fetch = null;
    this.setState({fetching: false, cur_path: path.replaceAll('\\', '/'), path_contents: results});
  }

  fetchRequestCatch(err) {
    console.log('Error: file fetch error: ', err);
    this.fetchRequestError(err.message);
  }

  fetchRequestError(msg) {
    // TODO: Display error message
    this.pending_fetch = null;
    this.setState({fetching: false});
  }

  folderSelected(new_path) {
    let cur_path = new_path;

    // Check for special up-one-level folder
    if (new_path === '..') {
      if (this.state.cur_path.length > 1) {
        let parts = this.state.cur_path.split('/');
        console.log("FOLDER",parts);
        if (parts.length > 1) {
          parts.pop();
        }
        cur_path = ('/'  + parts.join('/')).replaceAll('//', '/');
        console.log("NEW:", cur_path);
      } else {
        cur_path = this.props.path;
      }
    }
    this.fetchRequestStart(cur_path);
  }

  displayPathItem(item, idx) {
    const item_class_name = item.type ==='file' ? 'file-edit-path-display-file' : 'file-edit-path-display-folder';
    const image_source = item.type ==='file' ? 'file_image.png' : 'folder_image.png';
    const click_cb = item.type ==='file' ?  null : () => this.folderSelected(item.path);
    const item_size = item.type ==='file' ? item.size : '';

    return (
      <tr className="file-edit-path-display-item-row" key={'row_' + item.name} >
        <td id={idx + '_display-item-wrapper'} className="file-edit-path-item" onClick={click_cb}>
          <div className="file-edit-path-display-file-wrapper">
            <img src={image_source} alt=""/>
            <div id={idx + '_' + item.name} key={item.name} className={'file-edit-path-display-item ' + item_class_name}>{item.name}</div>
          </div>
        </td>
        <td id={idx + '_display_item_date'} className="file-edit-path-item file-edit-path-display-date">
          {item.date}
        </td>
        <td id={idx + '_display_item_size'} className="file-edit-path-item file-edit-path-display-size">
          {item_size}
        </td>
      </tr>
    );
  }

  displayContents() {
    let parent_el = document.getElementById('file_edit_path_display');
    if (!parent_el) {
      parent_el = document.getElementById('file_edit_path_display_wrapper');
    }
    if (!parent_el) {
      return null;
    }

    var display_style = {};
    const client_rect = parent_el.getBoundingClientRect();

    display_style['left'] = client_rect.x;
    display_style['top'] = client_rect.y;
    display_style['width'] = client_rect.width;
    display_style['height'] = client_rect.height;

    let folder_navigation = null;
    if (this.state.cur_path !== '/') {
      folder_navigation = [{
        name: '..', path: '..', type: 'folder'
      }]
    }

    return (
      <div id="file_edit_path_contents_table_wrapper" className="file-edit-path-contents-table-wrapper">
        <table id="file_edit_path_contents_table" className="file-edit-path-contents-table">
          <thead>
            <tr>
              {file_display_titles.map((title) => {return(<th key={'file_edit_path_contents_table_' + title} className="file-edit-path-contents-table-header">{title}</th>);})}
            </tr>
          </thead>
          <tbody>
              {folder_navigation && folder_navigation.map(this.displayPathItem)}
              {this.state.path_contents && this.state.path_contents.map(this.displayPathItem)}
          </tbody>
        </table>
      </div>
    );
  }

  displayError(msg) {
    // TODO    
    console.log("ERROR", msg);
  }

  displayFetchWait() {
    let parent_el = document.getElementById('file_edit_path_display');
    if (!parent_el) {
      parent_el = document.getElementById('file_edit_path_display_wrapper');
    }
    if (!parent_el) {
      return null;
    }

    var wait_style = {};
    const client_rect = parent_el.getBoundingClientRect();

    wait_style['left'] = client_rect.x;
    wait_style['top'] = client_rect.y;
    wait_style['width'] = client_rect.width;
    wait_style['height'] = client_rect.height;

    return (
      <div id="file_edit_path_display_wait_wrapper" className="file-edit-path-display-wait-wrapper" style={wait_style}>
        <span style={{flex:1}}>Waiting...</span>
      </div>
    );
  }

  generatePlainUI(item) {
    const min_length = item.hasOwnKeyword('minlength') ? item.minlength : null;
    const max_length = item.hasOwnKeyword('maxlength') ? item.maxlength : null;
    const is_dropdown = item.hasOwnKeyword('choices');
    const is_mandatory = item.hasOwnKeyword('mandatory') ? item.mandatory : false;

    if (!is_dropdown) {
      var props = {};
      if (min_length) props['minlength'] = '' + min_length;
      if (max_length) props['maxlength'] = '' + max_length;
      return (
        <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
          <input id={'file_edit_interface_table_value_' + item.name} type="text" size="100" className="file-edit-interface-table-value" {...props}></input>
          {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
        </div>
      );
    } else {
      return (
        <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
          <select id={'file_edit_interface_table_' + item.name}>
            {item.choices.map((value) => {return(<option key={item.name + '.' + value} value={value}>{value}</option>);})}
          </select>
          {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
        </div>
      );
    }
  }

  generateSecretUI(item) {
    const min_length = item.hasOwnKeyword('minlength') ? item.minlength : null;
    const max_length = item.hasOwnKeyword('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnKeyword('mandatory') ? item.mandatory : false;

    var props = {};
    if (min_length) props['minlength'] = '' + min_length;
    if (max_length) props['maxlength'] = '' + max_length;
    return (
      <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
        <input id={'file_edit_interface_table_value_' + item.name} type="password" size="100" className="file-edit-interface-table-value" {...props}></input>
        {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
      </div>
    );
  }

  generatePasswordUI(item) {
    const min_length = item.hasOwnKeyword('minlength') ? item.minlength : null;
    const max_length = item.hasOwnKeyword('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnKeyword('mandatory') ? item.mandatory : false;

    // TODO: Add checkbox for showing password in plain text
    var props = {};
    if (min_length) props['minlength'] = '' + min_length;
    if (max_length) props['maxlength'] = '' + max_length;
    return (
      <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
        <input id={'file_edit_interface_table_value_' + item.name} type="password" size="100" className="file-edit-interface-table-value" {...props}></input>
        {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
      </div>
    );
  }

  generateInterfaceItem(item) {
    switch (item.type) {
      case IData.auth_ui_type.plain:
        return this.generatePlainUI(item);

      case IData.auth_ui_type.secret:
        return this.generateSecretUI(item);

      case IData.auth_ui_type.password:
        return this.generatePasswordUI(item);

      default:
        break;
    }

    console.log("Error: unknown File authentication type for item", item);
    return null;
  }

  generateInterfaceUI() {
    const interface_ui = this.interface.authentication();

    // Only retun something if we have an authentification configuration
    if (!interface_ui) {
      return null;
    }

    return (
      <div id="file_edit_interface_wrapper" className="file-edit-interface-wrapper">
        <table id="file_edit_interface_table" className="file-edit-interface-table">
            <tbody>
              {interface_ui.map((item) => {
                return (
                  <tr id={'file_edit_interface_table_row_' + item.name} key={item.name} className="files-detail-row">
                    <td id={'file_edit_interface_table_name_' + item.name} className="file-edit-interface-table-item file-edit-interface-table-prompt">{item.prompt}</td>
                    <td id={'file_edit_interface_table_type_' + item.name} className="file-edit-interface-table-item file-edit-interface-table-value">
                      {this.generateInterfaceItem(item)}
                    </td>
                  </tr>
                ); 
              })}
            </tbody>
        </table>
      </div>
    );
  }

  handleDocumentKey(ev) {
    switch(ev.key) {
      case'Escape':
        this.onCancel();
        break;

      default: break;
    }
  }

  handleGoButton(ev) {
    let path_el = document.getElementById('file_edit_path_edit');

    if (path_el && path_el.value) {
      this.fetchRequestStart(path_el.value);
    }
  }

  handlePathKey(ev) {
    switch(ev.key) {
      case 'Enter':
        this.fetchRequestStart(ev.target.value);
        break;

      case'Escape':
        let el = document.getElementById('file_edit_path_edit');
        if (el)
          el.blur();
        ev.stopImmediatePropagation();
        break;

      default: break;
    }
  }

  onCancel() {
    this.props.cancel(this.props.source);
  }

  onNameUpdated(ev) {
    this.setState({name: ev.target.value});
  }

  onOk() {
    let el = document.getElementById('file_edit_name_edit');
    const name = el ? el.value : '';

    if (!name || (name.length <= 0)) {
      this.displayError("Please enter a name and try again");
      el.focus();
      return;
    }

    el =  document.getElementById('file_edit_path_edit');
    const path = el ? el.value : '';

    if (!path || (path.length <= 0)) {
      this.displayError("Please enter a path and try again");
      el.focus();
      return;
    }

    if (this.props.hasOwnProperty('name_check')) {
      if (!this.props.name_check(name)) {
        this.displayError("Duplicate name found. Please rename and try again.");
        el.focus();
        return;
      }
    }

    let item_id = null;
    if (this.props.hasOwnProperty('edit_item') && this.props.edit_item) {
      if (this.props.edit_item.hasOwnProperty('id')) {
        item_id = this.props.edit_item['id'];
      }
    }

    this.props.submit(this.props.source, name, path, this.authentication, item_id);
  }

  onPathUpdated(ev) {
    this.setState({cur_path: ev.target.value});
  }

  render() {
    const cur_path = this.state.cur_path;
    const cur_name = this.state.name;

    return (
    <div id="file_edit_background" className="file-edit-background">
      <div id="file_edit_wrapper" className="file-edit-wrapper">
        <div id="file_edit_titlebar" className="file-edit-titlebar">
          <div id="file_edit_titlebar_left" className="file-edit-titlebar-left"></div>
          <div id="file_edit_titlebar_center" className="file-edit-titlebar-center">{this.props.title}</div>
          <div id="file_edit_titlebar_right" className="file-edit-titlebar-right">
            <div id="file_edit_titlebar_cancel" className="file-edit-titlebar-close" onClick={this.onCancel} >x</div>
          </div>
        </div>
        <div id="file_edit_name_wrapper" className="file-edit-name-wrapper">
          <div id="file_edit_name_prompt" className="file-edit-name-prompt">Name</div>
          <div id="file_edit_name_edit_wrapper" className="file-edit-name-edit-wrapper">
            <input id="file_edit_name_edit" type="text" maxLength="150" value={cur_name} onChange={this.onNameUpdated} className="file-edit-name-edit"></input>
          </div>
        </div>
        {this.interface && this.generateInterfaceUI()}
        <div id="file_edit_path_wrapper" className="file-edit-path-wrapper">
          <div id="file_edit_path_prompt" className="file-edit-path-prompt">Path</div>
          <div id="file_edit_path_edit_wrapper" className="file-edit-path-edit-wrapper">
            <input id="file_edit_path_edit" type="text" size="60" maxLength="1024" value={cur_path.toString()} onChange={this.onPathUpdated} className="file-edit-path-edit"></input>
          </div>
          <div id="file_edit_path_edit_go" className="file-edit-path-edit-go" onClick={this.handleGoButton} >...</div>
        </div>
        <div id="file_edit_path_display_wrapper" className="file-edit-path-display-wrapper">
          <div id="file_edit_path_display" className="file-edit-path-display">
          {this.state.path_contents && this.displayContents()}
          </div>
        </div>
        <div name="file_edit_footer" className="file-edit-footer">
          <div name="file_edit_ok" className="file-edit-button file-edit-ok" onClick={this.onOk}>OK</div>
          <div name="file_edit_spacer" className="file-edit-footer-spacer"></div>
          <div name="file_edit_cancel" className="file-edit-button file-edit-cancel" onClick={this.onCancel}>Cancel</div>
        </div>
      </div>
      {this.state.fetching && this.displayFetchWait()}
    </div>
    );
  }
}

export default AFilesEdit;