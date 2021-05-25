/**
 * @fileoverview Generates UI components allowing the user to configure file interfaces
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { Component } from 'react';
import FileInterfaces from './FileInterfaces';
import AFilesList from './AFilesList';
import Message from './Message';
import IData from './data/IData';
import './AFilesEdit.css';

/**
 * Generates the UI for user configuration of remote file servers
 * @extends Component
 */
class AFilesEdit extends Component {
  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   * @constructor
   */
  constructor(props) {
    super(props);

    this.connectRequestCatch = this.connectRequestCatch.bind(this);
    this.connectRequestFinish = this.connectRequestFinish.bind(this);
    this.connectRequestStart = this.connectRequestStart.bind(this);
    this.dismissMessage = this.dismissMessage.bind(this);
    this.displayError = this.displayError.bind(this);
    this.displayDisabledResults = this.displayDisabledResults.bind(this);
    this.displayFetchWait = this.displayFetchWait.bind(this);
    this.fetchRequestCatch = this.fetchRequestCatch.bind(this);
    this.fetchRequestError = this.fetchRequestError.bind(this);
    this.fetchRequestFinish = this.fetchRequestFinish.bind(this);
    this.fetchRequestStart = this.fetchRequestStart.bind(this);
    this.fileSelected = this.fileSelected.bind(this);
    this.folderSelected = this.folderSelected.bind(this);
    this.generateInterfaceItem = this.generateInterfaceItem.bind(this);
    this.generateInterfaceUI = this.generateInterfaceUI.bind(this);
    this.generateMandatoryUI = this.generateMandatoryUI.bind(this);
    this.getAuthenticationFields = this.getAuthenticationFields.bind(this);
    this.handleDocumentKey = this.handleDocumentKey.bind(this);
    this.handleGoButton = this.handleGoButton.bind(this);
    this.handlePathKey = this.handlePathKey.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onMandatoryCheck = this.onMandatoryCheck.bind(this);
    this.onNameUpdated = this.onNameUpdated.bind(this);
    this.onOk = this.onOk.bind(this);
    this.onPathUpdated = this.onPathUpdated.bind(this);
    this.verifyMandatoryFieldsFilled = this.verifyMandatoryFieldsFilled.bind(this);

    this.interface = FileInterfaces.getInterface(props.source);
    this.interface_info = this.interface.initialize();

    let cur_path = this.props.path ? this.props.path : '/';
    let cur_name = this.props.edit_item ? this.props.edit_item.name : this.interface_info.name;

    // Class variables
    this.connected = false;          // Flag used to determine if we're connected
    this.pending_fetch = null;       // Current pending request
    this.pending_fetch_id = 1;       // The ID of the current pending fetch
    this.authentication_ids = [];    // IDs of authentication elements
    this.mandatory_check_ids = [];   // IDs of elements that need checks for mandatory values

    this.state = {
      cur_path: cur_path,               // Current working path
      is_file: null,                    // Flag for current path being a file or folder
      fetching: false,                  // Convenience flag for UI updates
      path_contents: null,              // Folder contents
      name: cur_name,                   // Working name of definition
      mandatory_fields_filled: false,   // Indicates mandatory fields have been filled out
      authentication_changed: false,    // Indicates when a mandatory authentication field has changed, reset when a connection is successful
      errors: null,
    }
  }

  /**
   * Called when this componenent is mounted, before display
   */
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
      this.fetchRequestStart(this.state.cur_path);
    }
  }

  /**
   * Called just before this component is unmounted and still displaying
   */
  componentWillUnmount() {
    document.removeEventListener('keydown',  this.handleDocumentKey, false);

    let el = document.getElementById('file_edit_path_edit');
    if (el) {
      el.removeEventListener("keydown", this.handlePathKey, false);
    }
  }

  /**
   * Called when an exception ocurrs while connecting to a remote server
   * @param {Object} err - the error object
   * @param {string} err.message - the message of the problem
   */
  connectRequestCatch(err) {
    console.log('Error: File connect error: ', err);
    this.connectRequestError(err.message);
  }

  /**
   * Called when an error ocurrs during a connection request
   * @param {string} msg - the message to display
   */
  connectRequestError(msg) {
    this.displayError(msg);
    this.pending_fetch = null;
    this.setState({fetching: false});
  }

  /**
   * Called when a connection request is successful
   * @callback AFilesEdit~ConnectRequestFinishCallback
   * @param {string} path - the starting path returned by the remote server upon connecting
   */

  /**
   * Called when a connection request has successfully completed
   * @param {int} request_id - the ID of the connection request - used to prevent old requests from overwriting newer ones
   * @param {Object} results - the result of the connection request
   * @param {String} results.path - the result of the connection request
   * @param {AFilesEdit~ConnectRequestFinishCallback} finish_cb - the callback for a successful request
   */
  connectRequestFinish(request_id, results, finish_cb) {
    console.log("connectRequestFinish", results);
    // Ignore finished requests that are not us
    if (this.pending_fetch_id !== request_id + 1) {
      return;
    }

    // Remove pending status, indicate we're connected, and update state
    const returned_path = results && results.path !== undefined ? results.path.replaceAll('\\', '/') : '/';
    this.pending_fetch = null;
    this.connected = true;
    this.setState({fetching: false, cur_path: returned_path, path_contents: null, authentication_changed: false});

    // If there's a callback, call it later to allow stuff to update
    if (finish_cb && (typeof finish_cb === 'function')) {
      window.setTimeout(() => {finish_cb(returned_path)}, 1);
    }
  }

  /**
   * Starts the connection request to a remote server
   * @param {AFilesEdit~ConnectRequestFinishCallback} connect_cb - callback upon a successful connection request
   */
  connectRequestStart(connect_cb) {
    if (this.pending_fetch) {
      console.log("ERROR: cancel the previous request before trying again to connect");
      alert("Unable to connect at this time, please wait and try again")
      return;
    }

    if (!this.verifyMandatoryFieldsFilled()) {
      this.setState({mandatory_fields_filled: false});
      return;
    }

    const connect_info = this.getAuthenticationFields();

    this.setState({fetching: true, mandatory_fields_filled: true});
    this.pending_fetch = new Promise((resolve, reject) => this.interface.connect(connect_info, resolve, reject))
      .then(results => {this.connectRequestFinish(this.pending_fetch_id++, results, connect_cb)})
      .catch(this.connectRequestCatch);
  }

  /**
   * Called when the user dismisses an error message
   */
  dismissMessage() {
    this.setState({errors: null});
  }

  /**
   * Called when a fetch request throws an error
   * @param {Object} err - the error object
   * @param {string} err.message - the error message
   */
  fetchRequestCatch(err) {
    console.log('Error: file fetch error: ', err);
    this.fetchRequestError(err.message);
  }

  /**
   * Called to display an error when fetching folder contents from a remote server
   * @param {string} msg - the message to display
   */
  fetchRequestError(msg) {
    this.displayError(msg);
    this.pending_fetch = null;
    this.setState({fetching: false});
  }

  /**
   * Called upon successfull completion of a folder's contents request
   * @param {int} request_id - the ID of the request, used to prevent old requests from overwriting newer ones
   * @param {string} path - the path the contents were fetched from
   * @param {Object[]} results - the array of the folder contents
   */
  fetchRequestFinish(request_id, path, results) {
    // Ignore finished requests that are not us
    if (this.pending_fetch_id !== request_id + 1) {
      return;
    }

    // Remove pending status  and update state
    this.pending_fetch = null;
    this.setState({fetching: false, cur_path: path.replaceAll('\\', '/'), is_file: false, path_contents: results});
  }

  /**
   * Make a request for the folder contents of the specified path from the remote server
   * @param {string} path - the path to fetch the contents of
   */
  fetchRequestStart(path) {
    if (this.pending_fetch) {
      console.log("ERROR: cancel previous file fetch before begining a new one");
      alert("Unable to complete request at this time, please wait and try again");
      return;
    }

    if (!this.verifyMandatoryFieldsFilled()) {
      this.setState({mandatory_fields_filled: false});
      return;
    }

    this.setState({fetching: true, mandatory_fields_filled: true});
    this.pending_fetch = new Promise((resolve, reject) => this.interface.listFolder(path, '*', resolve, reject))
      .then(folder_contents => {this.fetchRequestFinish(this.pending_fetch_id++, path, folder_contents);})
      .catch(this.fetchRequestCatch);
  }

  /**
   * Handles a file being selected by the user
   * @param {string} new_path - the path to the file
   */
  fileSelected(new_path) {
    this.setState({cur_path: new_path.replaceAll('\\', '/'), is_file: true});
  }

  /**
   * Handles the folder selected by the user
   * @param {string} new_path - the path to the selected folder
   */
  folderSelected(new_path) {
    let cur_path = new_path;

    // Check for special up-one-level folder
    if (new_path === '..') {
      if (this.state.cur_path.length > 1) {
        let parts = this.state.cur_path.split('/');
        if (parts.length > 1) {
          parts.pop();
        }
        if (this.state.is_file && parts.length > 1) {
          parts.pop();
        }
        cur_path = ('/'  + parts.join('/')).replaceAll('//', '/');
      } else {
        cur_path = this.props.path;
      }
    }
    this.fetchRequestStart(cur_path);
  }

  /**
   * Returns the UI of the results in a disabled state
   */
  displayDisabledResults() {
    return this.displayResultsOverlay('', 'file-edit-path-display-disabled');
  }

  /**
   * Handles showing error messages
   * @param {string} msg - the message to show
   */
  displayError(msg) {
    this.setState({errors: msg});
  }

  /**
   * Returns the UI while waiting for results
   */
  displayFetchWait() {
    return this.displayResultsOverlay('Waiting...', 'file-edit-path-display-wait');
  }

  /**
   * Common function returning a disabling overlay of folder content UI
   * @param {string} [msg] - optional message to display
   * @param {string[]} [additional_class_names] - optional class names to apply to the top-level UI element
   */
  displayResultsOverlay(msg, additional_class_names) {
    let parent_el = document.getElementById('file_edit_path_display');
    if (!parent_el) {
      parent_el = document.getElementById('file_edit_path_display_wrapper');
    }
    if (!parent_el) {
      return null;
    }

    var wait_style = {};
    const client_rect = parent_el.getBoundingClientRect();

    wait_style.left = client_rect.x;
    wait_style.top = client_rect.y;
    wait_style.width = client_rect.width;
    wait_style.height = client_rect.height;

    return (
      <div id="file_edit_path_display_overlay_wrapper" className={'file-edit-path-display-overlay-wrapper ' + additional_class_names} style={wait_style}>
        {msg && (msg.length > 0) && <span style={{flex:1}}>{msg}</span>}
      </div>
    );
  }

  /**
   * Returns the UI for a Text template
   * @param {Object} item - the template item to generate the UI for
   */
  generatePlainUI(item) {
    var props = {};
    const min_length = item.minlength !== undefined ? item.minlength : null;
    const max_length = item.maxlength !== undefined ? item.maxlength : null;
    const is_dropdown = item.choices !== undefined;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;

    if (!is_dropdown) {
      const element_id = 'file_edit_interface_table_value_' + item.name;
      this.authentication_ids.push(element_id);

      if (min_length) props.minlength = '' + min_length;
      if (max_length) props.maxlength = '' + max_length;
      if (item.default !== undefined) {
        props.defaultValue = item.default;
      }
      if (is_mandatory) {
        props.required = 'required';
        props.onChange = this.onMandatoryCheck;
        this.mandatory_check_ids.push(element_id);
      }

      return (
        <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
          <input id={element_id} type="text" size="50" className="file-edit-interface-table-value" {...props}></input>
          {is_mandatory && this.generateMandatoryUI()}
        </div>
      );
    } else {
      const element_id = 'file_edit_interface_table_' + item.name;
      this.authentication_ids.push(element_id);

      if (item.default !== undefined) {
        props.defaultValue = item.default;
      }
      if (is_mandatory) {
        props.required = 'required';
        props.onChange = this.onMandatoryCheck;
        this.mandatory_check_ids.push(element_id);
      }

      return (
        <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
          <select id={element_id} {...props}>
            {item.choices.map((value) => {return(<option key={item.name + '.' + value} value={value}>{value}</option>);})}
          </select>
          {is_mandatory && this.generateMandatoryUI()}
        </div>
      );
    }
  }

  /**
   * Returns the UI for Secret (not password) template
   * @param {Object} item - the template item to generate the UI for
   */
  generateSecretUI(item) {
    const min_length = item.minlength !== undefined ? item.minlength : null;
    const max_length = item.maxlength !== undefined ? item.maxlength : null;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = 'file_edit_interface_table_value_' + item.name;
    this.authentication_ids.push(element_id);

    var props = {};
    if (min_length) props.minlength = '' + min_length;
    if (max_length) props.maxlength = '' + max_length;
    if (item.default !== undefined) {
      props.defaultValue = item.default;
    }
    if (is_mandatory) {
      props.required = 'required';
      props.onChange = this.onMandatoryCheck;
      this.mandatory_check_ids.push(element_id);
    }

    return (
      <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
        <input id={element_id} type="password" className="file-edit-interface-table-value" {...props}></input>
        {is_mandatory && this.generateMandatoryUI()}
      </div>
    );
  }

  /**
   * Returns the UI for a Password template
   * @param {Object} item - the template item to generate the UI for
   */
  generatePasswordUI(item) {
    const min_length = item.minlength !== undefined ? item.minlength : null;
    const max_length = item.maxlength !== undefined ? item.maxlength : null;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = 'file_edit_interface_table_value_' + item.name;
    this.authentication_ids.push(element_id);

    // TODO: Add checkbox for showing password in plain text
    var props = {};
    if (min_length) props.minlength = '' + min_length;
    if (max_length) props.maxlength = '' + max_length;
    if (item.default !== undefined) {
      props.defaultValue = item.default;
    }
    if (is_mandatory) {
      props.required = 'required';
      props.onChange = this.onMandatoryCheck;
      this.mandatory_check_ids.push(element_id);
    }

    return (
      <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
        <input id={element_id} type="password" className="file-edit-interface-table-value" {...props}></input>
        {is_mandatory && this.generateMandatoryUI()}
      </div>
    );
  }

  /**
   * Returns the UI for a templated item
   * @param {Object} item - the template item to generate the UI for
   */
  generateInterfaceItem(item) {
    switch (item.style) {
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

  /**
   * Generates the interface UI for browsing remote file systems.
   * Auto-generates thee UI components for the remote server
   */
  generateInterfaceUI() {
    const interface_ui = this.interface.authentication();
    this.mandatory_check_ids = [];
    this.authentication_ids = [];

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
                  <tr id={'file_edit_interface_table_row_' + item.name} key={item.name} className="file-detail-row">
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

  /**
   * Returns the UI element for mandatory fields
   */
  generateMandatoryUI() {
    return (<span className="file-edit-interface-value-mandatory">*</span>);
  }

  /**
   * Retrieves the authentication fields from the UI
   * @return {Object} the field ids and their associated values
   */
  getAuthenticationFields() {
    let fields = {};

    this.authentication_ids.every((el_id) => {
      let el = document.getElementById(el_id);
      if (el) {
        let val = el.value;
        let name = this.mapGeneratedIdToName(el_id);

        if (name && val && (name.length > 0)) {
          fields[name] = val;
        }
      }

      return  true;
    });

    return fields;
  }

  /**
   * Handles the user pressing a key
   * @param {Object} ev - the triggering event
   * @param {string} ev.key - the key the user pressed
   */
  handleDocumentKey(ev) {
    switch(ev.key) {
      case 'Enter':
        if (this.state.authentication_changed) {
          this.handleGoButton();
        } else if  (this.verifyMandatoryFieldsFilled()) {
          this.onOk();
        }
        break;

      case'Escape':
        this.onCancel();
        break;

      default: break;
    }
  }

  /**
   * Handle the user pressing the 'Go' button to fetch the contents of a path from the remote server
   */
  handleGoButton() {
    let path_el = document.getElementById('file_edit_path_edit');

    if (path_el && path_el.value) {
      if (this.connected === false || this.state.authentication_changed) {
        this.connectRequestStart(() => this.fetchRequestStart(path_el.value));
      } else {
        this.fetchRequestStart(path_el.value);
      }
    }
  }

  /**
   * Handles the user pressing a key while editing the path
   * @param {Object} ev - the triggering event
   * @param {string} ev.key - the key the user pressed
   * @param stopImmediatePropagation - called to stop the event from propagating
   */
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

  /**
   * Maps a UI ID to a field name
   * @param {string} el_id - the ID to map
   */
  mapGeneratedIdToName(el_id) {
    return el_id.substr('file_edit_interface_table_value_'.length);
  }

  /**
   * Handles cancelling the browsing of files 
   */
  onCancel() {
    this.props.cancel(this.props.source);
  }

  /**
   * Checks if all mandatory fields are filled
   * @param {Object} ev - the triggering event
   */
  onMandatoryCheck(ev) {
    let el = null;
    let res = this.mandatory_check_ids.every((id) => {
          el = document.getElementById(id);
          if (el) {
            let val = el.value;
            if (!val || (val.length <= 0)) {
              return false;
            }
          }
          return true;
        });

    let new_state = {authentication_changed: true};

    if (res !== this.state.mandatory_fields_filled) {
      new_state.mandatory_fields_filled = res;
    }

    this.setState(new_state);
  }

  /**
   * Called when the name of the configuration has been updated
   * @param {Object} ev - the triggering event
   * @param {string} ev.target.value - the element value at the time of the event
   */
  onNameUpdated(ev) {
    this.setState({name: ev.target.value});
  }

  /**
   * Called when the user wants to save the configuration
   */
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

    if (!this.verifyMandatoryFieldsFilled()) {
      this.displayError("Please fill in all mandatory fields and try again");
      return;
    }

    el =  document.getElementById('file_edit_name_edit');
    if (this.props.name_check !== undefined) {
      if (!this.props.name_check(name)) {
        this.displayError("Duplicate or invalid name found. Please rename and try again.");
        el.focus();
        return;
      }
    }

    let item_id = null;
    if (this.props.edit_item !== undefined && this.props.edit_item) {
      if (this.props.edit_item.id !== undefined) {
        item_id = this.props.edit_item.id;
      }
    }

    this.props.submit(this.props.source, name, path, this.state.is_file, this.getAuthenticationFields(), item_id);
  }

  /**
   * Called when the user changes the path on the UI
   * @param {Object} ev - the triggering event
   * @param {string} ev.target.value - the element value at the time of the event
   */
  onPathUpdated(ev) {
    this.setState({cur_path: ev.target.value});
  }

  /**
   * Checks that all the mandatory fields have been filled out on the UI
   * @returns {bool} true indicates that all fields have been filled, and false that they haven't been filled
   */
  verifyMandatoryFieldsFilled() {
    let el = document.getElementById('file_edit_name_edit');
    if (el) {
      let val = '' + el.value;
      if (!val || (val.length <= 0)) {
        el.focus();
        return false;
      }
    }

    el = document.getElementById('file_edit_path_edit');
    if (el) {
      let val = '' + el.value;
      if (!val || (val.length <= 0)) {
        el.focus();
        return false;
      }
    }

    let res = this.mandatory_check_ids.every((el_id) => {
      el = document.getElementById(el_id);
      if (el) {
        let val = '' + el.value;
        if (!val || (val.length <= 0)) {
          el.focus();
          return false;
        }
      }
      return true;
    });
    if (!res) {
      return false;
    }

    return true;
  }

  /**
   * Generates the UI for defining remote server connections and folders
   */
  render() {
    const cur_path = this.state.cur_path;
    const cur_name = this.state.name;
    const missing_data = !this.state.mandatory_fields_filled;
    const go_button_classes = 'file-edit-path-edit-go ' + ((missing_data || this.state.is_file === true) ? 'file-edit-path-edit-go-disabled' : '');
    const ok_button_disabled = missing_data || this.state.authentication_changed;
    const ok_button_classes = 'file-edit-button file-edit-ok ' + (ok_button_disabled ? 'file-edit-button-disabled file-edit-ok-disabled' : '');
    const have_errors = this.state.errors !== null;

    return (
      <div id="file_edit_background" className="file-edit-background">
        {have_errors && <Message msg={this.state.errors} type={Message.type.warning} ok={this.dismissMessage} cancel={this.dismissMessage} />}
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
            {this.generateMandatoryUI()}
          </div>
          {this.interface && this.generateInterfaceUI()}
          <div id="file_edit_path_wrapper" className="file-edit-path-wrapper">
            <div id="file_edit_path_prompt" className="file-edit-path-prompt">Path</div>
            <div id="file_edit_path_edit_wrapper" className="file-edit-path-edit-wrapper">
              <input id="file_edit_path_edit" type="text" size="60" maxLength="1024" value={cur_path.toString()} onChange={this.onPathUpdated} 
                     className="file-edit-path-edit" disabled={missing_data}></input>
            </div>
            <div id="file_edit_path_edit_go" className={go_button_classes} onClick={missing_data ? null : this.handleGoButton} >...</div>
          </div>
          <div id="file_edit_path_display_wrapper" className="file-edit-path-display-wrapper">
            <div id="file_edit_path_display" className="file-edit-path-display">
              {this.state.path_contents && 
                <AFilesList parent_id={'file_edit_path_display'} start_path={this.props.path} path={this.state.cur_path} is_file={this.state.is_file} 
                            contents={this.state.path_contents} folder_sel={this.folderSelected} file_sel={this.fileSelected} />
              }
            </div>
          </div>
          <div name="file_edit_footer" className="file-edit-footer">
            <div name="file_edit_ok" className={ok_button_classes} onClick={missing_data ? null : this.onOk}>OK</div>
            <div name="file_edit_spacer" className="file-edit-footer-spacer"></div>
            <div name="file_edit_cancel" className="file-edit-button file-edit-cancel" onClick={this.onCancel}>Cancel</div>
          </div>
        </div>
        {this.state.fetching && this.displayFetchWait()}
        {missing_data && this.displayDisabledResults()}
      </div>
    );
  }
}

export default AFilesEdit;