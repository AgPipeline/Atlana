//Implementation of file system interface
import { Component } from 'react';
import FileInterfaces from './FileInterfaces';
import IData from './data/IData';
import './AFilesEdit.css';

class AFilesEdit extends Component {
  constructor(props) {
    super(props);

    this.displayFetchWait = this.displayFetchWait.bind(this);
    this.generateInterfaceItem = this.generateInterfaceItem.bind(this);
    this.generateInterfaceUI = this.generateInterfaceUI.bind(this);
    this.onCancel = this.onCancel.bind(this);

    this.interface = FileInterfaces.getInterface(props.source);
    this.interface_info = this.interface.initialize();

    this.state = {
      cur_path: props.path,
      fetching: false,
      path_contents: null,
    }
  }

  pending_fetch = null;

  onComponentMount() {
    if (this.state.fetching) {
      let el = document.getElementById('file_edit_path_display_wait_wrapper');
      if (!el) {
        this.displayFetchWait();
      }
    }

    // If we have a starting path, make the request
    this.fetchRequestStart();
  }

  fetchRequestStart(path) {
    if (this.pending_fetch) {
      console.log("ERROR: cancel previous file fetch before begining a new one");
      alert("Unable to complete request at this time, please wait and try again");
      return;
    }
    this.pending_fetch = new Promise();
    this.setState({fetching: true});
  }

  fetchRequestMake(path) {
  }

  fetchRequestFinish(request_id, path, results) {
    // Ignore finished requests that are not us
    if (this.pending_fetch !== request_id) {
      return;
    }

    // Remove pending status  and update state
    this.pending_fetch = null;
    this.setState({fetching: false, cur_path: path, path_contents: results});
  }

  fetchRequestError(msg) {
    // TODO: Display error message
    this.pending_fetch = null;
    this.setState({fetching: false});
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

  onCancel() {
    this.props.cancel(this.props.source);
  }

  render() {
    const cur_path = this.props.hasOwnProperty('path') ? this.props.path : '/';

    // TODO Add "go" button next to path
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
            <input id="file_edit_name_edit" type="text" maxLength="150" className="file-edit-name-edit"></input>
          </div>
        </div>
        {this.interface && this.generateInterfaceUI()}
        <div id="file_edit_path_wrapper" className="file-edit-path-wrapper">
          <div id="file_edit_path_prompt" className="file-edit-path-prompt">Path</div>
          <div id="file_edit_path_edit_wrapper" className="file-edit-path-edit-wrapper">
            <input id="file_edit_path_edit" type="text" maxLength="1024" defaultValue={cur_path.toString()} className="file-edit-path-edit"></input>
          </div>
        </div>
        <div id="file_edit_path_display_wrapper" className="file-edit-path-display-wrapper">
          <div id="file_edit_path_display" className="file-edit-path-display">
          {this.state.fetching && this.displayFetchWait()}
          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default AFilesEdit;