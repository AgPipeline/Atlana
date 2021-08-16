/**
 * @fileoverview Browsing folders UI
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { Component } from 'react';
import AFilesList from './AFilesList';
import FileInterfaces from './FileInterfaces';
import './BrowseFolders.css';

/**
 * Renders file browsing UI with support for user entered values
 * @extends Component
 */
class BrowseFolders extends Component {
  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.connectRequestCatch = this.connectRequestCatch.bind(this);
    this.connectRequestError = this.connectRequestError.bind(this);
    this.connectRequestFinish = this.connectRequestFinish.bind(this);
    this.connectRequestStart = this.connectRequestStart.bind(this);
    this.displayError = this.displayError.bind(this);
    this.displayFetchWait = this.displayFetchWait.bind(this);
    this.fetchRequestCatch = this.fetchRequestCatch.bind(this);
    this.fetchRequestError = this.fetchRequestError.bind(this);
    this.fetchRequestFinish = this.fetchRequestFinish.bind(this);
    this.fetchRequestStart = this.fetchRequestStart.bind(this);
    this.fileSelected = this.fileSelected.bind(this);
    this.folderSelected = this.folderSelected.bind(this);
    this.generateBrowseUI = this.generateBrowseUI.bind(this);
    this.generateFolderSelection = this.generateFolderSelection.bind(this);
    this.generateNoFoldersUI = this.generateNoFoldersUI.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onFolderChange = this.onFolderChange.bind(this);
    this.onOk = this.onOk.bind(this);

    // Initialize class variables
    this.folder_instance = null;       // The definition of remove folder
    this.interface = null;             // The active interface to remote storage
    this.fetch_pending = null;         // The current working fetch request
    this.fetch_pending_id = 0;         // Value used to keep track of latest fetch

    // Initialize to a single source if there is only one choice
    const folder_selected_id = this.props.folders && this.props.folders.length === 1 ? this.props.folders[0].id : null;
    if (folder_selected_id !== null) {
      this.folder_instance = this.props.folders.find((item) => item.id === folder_selected_id);
      this.interface = FileInterfaces.getInterface(this.folder_instance.data_type);
      this.cur_path = this.folder_instance.location;
    }

    this.state =  {
      cur_path: null,                   // The working path
      is_file: null,                    // Flag for indicating if path is a file, or not
      selected_id: folder_selected_id,  // The ID of the user's selection
      path_contents: [],                // The contents of the path
      fetching: false,                  // Quick flag to show we're fetching data
    };
  }

  /**
   * Called when this component is mounted, before display
   */
  componentDidMount() {
    if (this.state.selected_id !== null) {
      this.connectRequestStart(this.props.folders[0].auth, () => this.fetchRequestStart(this.props.folders[0].auth, this.props.folders[0].location));
    }
  }

  /**
   * Handler for data source connection request exceptions
   * @param {Object} err - the error object with the meessage
   * @param {string} err.message - the error meessage
   */
  connectRequestCatch(err) {
    this.connectRequestError(err.message);
  }

  /**
   * Handle an error message when connecting to a remote source
   * @param {string} msg - the message to display
   */
  connectRequestError(msg) {
    this.displayError(msg);
    this.fetch_pending = null;
    this.setState({fetching: false});
  }

  /**
   * Called when a connection request is successful
   * @callback BrowseFolders~ConnectRequestFinishCallback
   * @param {string} path - the starting path returned by the remote server upon connecting
   */

  /**
   * Handles when a connection request has successfully finished
   * @param {int} request_id - the ID of the original request; used to prevent old requests from overwriting newer ones
   * @param {Object.<path>} results - the results of the connection request
   * @param {BrowseFolders~ConnectRequestFinishCallback} finish_cb - called with the starting path returned by the remote server
   */
  connectRequestFinish(request_id, results, finish_cb) {
    // Ignore finished requests that are not us
    if (this.fetch_pending_id !== request_id + 1) {
      return;
    }

    // Remove pending status, indicate we're connected, and update state
    const returned_path = results && (results.path !== undefined) ? results.path.replaceAll('\\', '/') : '/';
    this.fetch_pending = null;
    this.connected = true;
    this.setState({fetching: false, cur_path: returned_path, path_contents: null});

    // If there's a callback, call it later to allow stuff to update
    if (finish_cb && (typeof finish_cb === 'function')) {
      window.setTimeout(() => {finish_cb(returned_path)}, 1);
    }
  }

  /**
   * Initializes a connection request to the remote server
   * @param {Object} connect_info - information provided by the user to connect to the remote server
   * @param {BrowseFolders~ConnectRequestFinishCallback} connect_cb - called upon successful connection with the remote server
   */
  connectRequestStart(connect_info, connect_cb) {
    if (this.fetch_pending) {
      console.log("ERROR: cancel the previous request before trying again to connect");
      alert("Unable to connect at this time, please wait and try again")
      return;
    }

    this.setState({fetching: true});
    this.fetch_pending = new Promise((resolve, reject) => this.interface.connect(connect_info, resolve, reject))
      .then(results => {this.connectRequestFinish(this.fetch_pending_id++, results, connect_cb)})
      .catch(this.connectRequestCatch);
  }

  /**
   * Display an error
   * @param {string} msg - the error message
   */
  displayError(msg) {
    console.log('ERROR: ', msg);
    // TODO: display error
  }

  /**
   * Returns the waiting UI
   */
  displayFetchWait() {
    const additional_class_names = 'browse-folder-display-wait';
    const msg = 'Waiting...';
    let parent_el = document.getElementById('browse_folder_browse_wrapper');
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
      <div id="browse_folder_display_overlay_wrapper" className={'browse-folder-display-overlay-wrapper ' + additional_class_names} style={wait_style}>
        {msg && (msg.length > 0) && <span style={{flex:1}}>{msg}</span>}
      </div>
    );
  }

  /**
   * Handles exceptions from a fetch request
   * @param {Object} err - the error information
   * @param {string} err.message - the error message
   */
  fetchRequestCatch(err) {
    console.log('Error: file fetch error: ', err);
    this.fetchRequestError(err.message);
  }

  /**
   * Displays an error from a fetch request
   * @param {string} msg - the error message
   */
  fetchRequestError(msg) {
    this.displayError(msg);
    this.fetch_pending = null;
    this.setState({fetching: false});
  }

  /**
   * Called when a fetch request was successful
   * @param {int} request_id - the ID associated with the request; used to prevent old requests from overwriting newer ones
   * @param {string} path - the path associated with the fetch
   * @param {Object} results - the path contents of the fetch request
   */
  fetchRequestFinish(request_id, path, results) {
    // Ignore finished requests that are not us
    if (this.fetch_pending_id !== request_id + 1) {
      return;
    }

    // Remove pending status  and update state
    this.fetch_pending = null;
    this.setState({fetching: false, cur_path: path.replaceAll('\\', '/'), is_file: false, path_contents: results});
  }

  /**
   * Starts a fetch request for the contents of the specified path from the remote server
   * @param {Object} connect_info - user entered connection information for the remote server
   * @pararm {string} path - the path to fetch the contents ofs
   */
  fetchRequestStart(connect_info, path) {
    if (this.fetch_pending) {
      console.log("ERROR: cancel previous file fetch before begining a new one");
      alert("Unable to complete request at this time, please wait and try again");
      return;
    }

    this.setState({fetching: true});
    this.fetch_pending = new Promise((resolve, reject) => this.interface.listFolder(path, '*', resolve, reject))
      .then(folder_contents => {this.fetchRequestFinish(this.fetch_pending_id++, path, folder_contents);})
      .catch(this.fetchRequestCatch);
  }

  /**
   * Handles a file being selected by the user
   * @param {string} new_path - the new path selected by the user
   */
  fileSelected(new_path) {
    this.setState({cur_path: new_path.replaceAll('\\', '/'), is_file: true});
  }

  /**
   * Handles a folder being selected by the user
   * @param {string} new_path - the path selected by the user
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
        cur_path = ('/'  + parts.join('/')).replaceAll('//', '/');
      } else {
        cur_path = this.props.path;
      }
    }
    this.fetchRequestStart(this.interface.auth, cur_path);
  }

  /**
   * Returns the UI elements for browsing the remote server
   */
  generateBrowseUI() {
    return (
      <div id="browse_folder_browse_wrapper" className="browse-folder-browse-wrapper">
        <div id="browse_folder_browse_item_wrapper" className="browse-folder-browse-item-wrapper" >
          <div id="browse_folder_browse_path_prompt" className="browse-folder-browse-item browse-folder-browse-path-prompt">Path</div>
          <input id="browse_folder_browse_path_value" className="browse-folder-browse-item browse-folder-browse-path-value"
                 defaultValue={this.state.cur_path}>
          </input>
        </div>
        <div className="browse-folder-browse-display-wrapper">
          <div id="browse_folder_browse_display" className="browse-folder-browse-display">
            {this.state.path_contents != null &&
              <AFilesList parent_id={'browse_folder_browse_display'} start_path={this.cur_path} path={this.state.cur_path}
                        contents={this.state.path_contents} folder_sel={this.folderSelected} file_sel={this.fileSelected} />
            }
          </div>
        </div>
      </div>
    );
  }

  /**
   * Returns the UI for folder contents
   */
  generateFolderSelection()
  {
    if (this.props.folders.length <= 0) {
      return (null);
    }

    return (
      <select id="browse_folder_selector" className="browse-folder-selector" onChange={this.onFolderChange}>
        {this.props.folders.map((item, idx) => {
          return (
            <option id={'browse_folder_' + item.name} value={item.id} key={item.name + '_' + idx} className="browse-folder-option">{item.name}</option>
          );
        })}
      </select>
    );
  }

  /**
   * Returns the UI for when no folders are available to show
   */
  generateNoFoldersUI() {
    return (
      <div id="browse_folder_no_folders_wrapper" className="browse-folder-no-folder-wrapper">
        <div id="browse_folder_no_folders" className="browse-folder-no-folder">
          No folders are defined
        </div>
      </div>
    );
  }

  /**
   * Handles the user cancelling folder browsing
   */
  onCancel() {
    this.props.cancel();
  }

  /**
   * Called when the user selects a new remote server type (to browse)
   * @param {Object} ev - the triggering event
   */
  onFolderChange(ev) {
    let folder_instance =  this.props.folders.find((item) => item.id === ev.target.value);
    if (!folder_instance) {
      this.displayError("Unable to find selected folder location");
      return;
    }
    let inter = FileInterfaces.getInterface(folder_instance.data_type)
    if (!inter) {
      this.displayError("Unable to find interface associated with folder " + folder_instance.name);
      return;
    }

    this.folder_instance = folder_instance;
    this.interface = inter;
    this.setState({selected_id: ev.target.value});

    this.connectRequestStart(this.interface.auth, () => this.fetchRequestStart(this.interface.auth, this.interface.location));
  }

  /**
   * Called when the user wants to save their configuration
   */
  onOk() {
    this.props.selected(this.state.cur_path, this.folder_instance.id);
  }

  /**
   * Returns the UI for deefining remote server access
   */
  render() {
    const missing_data = this.props.folders.length <= 0;
    const ok_button_disabled = missing_data || (this.state.is_file === false);
    const ok_button_classes = 'browse-folder-button browse-folder-ok ' + (ok_button_disabled ? 
                                            'browse-folder-button-disabled browse-folder-ok-disabled' : '');

    return (
      <div id="browse_folder_background" className="browse-folder-background">
        <div className="browse-folder-edit-spacing"></div>
        <div id="browse_folder_wrapper" className="browse-folder-wrapper">
          <div id="browse_folder_titlebar" className="browse-folder-titlebar">
            <div id="browse_folder_titlebar_left" className="browse-folder-titlebar-left"></div>
            <div id="browse_folder_titlebar_center" className="browse-folder-titlebar-center">{this.props.title}</div>
            <div id="browse_folder_titlebar_right" className="browse-folder-titlebar-right">
              <div id="browse_folder_titlebar_cancel" className="browse-folder-titlebar-close" onClick={this.onCancel} >x</div>
            </div>
          </div>
          <div id="browse_folder_folders_wrapper" className="browse-folder-folders-wrapper">
            {this.props.folders.length > 0 ? this.generateFolderSelection() : this.generateNoFoldersUI()}
            {this.state.selected_id !== null && this.generateBrowseUI()}
          </div>
          <div name="browse_folder_footer" className="browse-folder-footer">
            <div name="browse_folder_ok" className={ok_button_classes} onClick={ok_button_disabled ? null : this.onOk}>OK</div>
            <div name="browse_folder_spacer" className="browse-folder-footer-spacer"></div>
            <div name="browse_folder_cancel" className="browse-folder-button browse-folder-cancel" onClick={this.onCancel}>Cancel</div>
          </div>
        </div>
        <div className="browse-folder-edit-spacing"></div>
        {this.fetchPending && this.displayFetchWait()}
      </div>
    );
  }
}

export default BrowseFolders;