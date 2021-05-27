/**
 * @fileoverview Interface for managing file accessability
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { Component } from 'react';
import FileInterfaces from './FileInterfaces';
import AFilesEdit from './AFilesEdit';
import WorkspaceTitlebar from './WorkspaceTitlebar';
import Message from './Message';
import Utils from './Utils';
import './AFiles.css';

/**
 * Table header names for display file/folder information
 */
var files_titles = [
  'Name',
  'Type',
  'Location',
  'File',
  'ID',
  ' ',
  ' ',
];

/**
 * Largest file size we will upload
 */
var MAX_FILE_SIZE = 1000*1024*1024

/**
 * The class for displaying file/folder definitions
 * @extends Component
 */
class AFiles extends Component {
  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.browseFiles = this.browseFiles.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.deleteitem = this.deleteItem.bind(this);
    this.dismissMessage = this.dismissMessage.bind(this);
    this.displayError = this.displayError.bind(this);
    this.dragDrop = this.dragDrop.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
    this.dragOver = this.dragOver.bind(this);
    this.dragStart = this.dragStart.bind(this);
    this.editItem = this.editItem.bind(this);
    this.fileBrowsed = this.fileBrowsed.bind(this);
    this.finishAdd = this.finishAdd.bind(this);
    this.finishEdit = this.finishEdit.bind(this);
    this.generateIsFileUI = this.generateIsFileUI.bind(this);
    this.generateNewFileUI = this.generateNewFileUI.bind(this);
    this.generateUploadingUI = this.generateUploadingUI.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.uploadHandle = this.uploadHandle.bind(this);
    this.nameCheck = this.nameCheck.bind(this);
    this.onGoBack = this.onGoBack.bind(this);
    this.updateNewType = this.updateNewType.bind(this);

    // Initialize variables that are used while uploading files
    this.upload_start_ts = null;
    this.uploaded_files = null;

    // Get the interfaces that are available
    this.file_interfaces = FileInterfaces.getFileInterfaceTypes();

    // The ID when a new definition is requested
    this.new_type_id = null;

    // The list of currently avaiable defined interfaces
    let files_list = this.props.files();
    if (!files_list) {
      files_list = [];
    }

    // Initialize our state variable
    this.state = {
      mode: null,               // What data source we're adding/editing
      mode_name: '',            // Working name when adding/editing
      mode_title: '',           // Working title for adding/editing
      mode_path: '/',           // The working path
      edit_add: true,           // Indicates if we're adding an item or editing it
      edit_item: null,          // The item we're editing, if we're editing an item
      files_list,               // The list of file information
      errors: null,             // Error information
      upload_count: 0,          // The number of files being uploaded
      display_uploading: false, // Used to display uploading elements
    }
  }

  /**
   * Handles the user wanting to define a new file/folder configuratiton
   * @param {Objec} ev - the triggering event
   */
  addItem(ev) {
    if (!this.new_type_id) {
      let el = document.getElementById('files_types');
      el.focus();
      return;
    }
    const cur_mode = this.new_type_id;
    let cur_mode_name = FileInterfaces.findById(cur_mode);
    if (cur_mode_name) {
      cur_mode_name = cur_mode_name.prompt;
    } else {
      cur_mode_name = '';
    }
    this.setState({mode: cur_mode, mode_name: cur_mode_name, mode_title: 'New ' +  cur_mode_name, mode_path: '/', edit_cb: this.finishAdd, 
                   edit_add: true, edit_item: null});
  }

  /**
   * Handles allowing the user to browse files for upload
   */
  browseFiles() {
    let browse = document.getElementById('files_types_file_find');
    browse.value = null;
    browse.style.display = "default";
    browse.click();
  }

  /**
   * Cancels the current editing of a file/folder configuration
   * @param {string} edit_id - the ID of the edit to cancel
   */
  cancelEdit(edit_id) {
    if ('' + this.state.mode === '' + edit_id) {
      this.setState({mode: null, mode_name: '', mode_title: ''});
    }
  }

  /**
   * Handles a request to delete a configuration
   * @param {Object} ev - the triggering event
   * @param {string} item_id - the ID of the configuration to  delette
   */
  deleteItem(ev, item_id) {
    let found_item = this.state.files_list.find((item) => item.id === item_id);
    if (!found_item) {
      this.displayError('Internal error prevented the removal of the entry');
      console.log('Unable to delete entry with ID: ', item_id);
      return;
    }

    if (this.props.onDelete !== undefined) {
      this.props.onDelete(found_item.id);
      this.setState({'files_list': this.props.files()});
    }
  }

  /**
   * Used to dismiss displayed popup messages
   */
  dismissMessage() {
    this.setState({errors: null});
  }

  /**
   * Used to display popup messages
   */
  displayError(msg) {
    this.setState({errors: msg});
  }

  /**
   * Handles the drop portion of the user dragging and dropping files
   * @param {Object} the drop event
   */
  dragDrop(ev) {
    let el = document.getElementById('files_types_upload_border');

    if (el) {
      el.classList.remove('files-types-upload-border-active');
    }

    ev.preventDefault();
    ev.stopPropagation();

    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      let all_files = [];
      for (let i = 0; i < ev.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (ev.dataTransfer.items[i].kind === 'file') {
          all_files.push(ev.dataTransfer.items[i].getAsFile());
        }
      }
      if (all_files.length > 0) {
        this.uploadHandle(all_files);
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      this.uploadHandle(ev.dataTransfer.files);
    }
  }

  /**
   * Renoves visual clues during a drag and drop operation
   * @param {Object} ev - the triggering event
   */
  dragEnd(ev) {
    let el = document.getElementById('files_types_upload_border');

    if (el) {
      el.classList.remove('files-types-upload-border-active');
    }

    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * Adds visual clues during a drag and drop operation
   * @param {Object} ev - the triggering event
   */
  dragOver(ev) {
    let el = document.getElementById('files_types_upload_border');

    if (el) {
      el.classList.add('files-types-upload-border-active');
    }

    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * Handles the start of a drag and drop event
   * @param {Object}  ev - the triggering event
   */
  dragStart(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * Handles the request to edit an existing configuration
   * @param {Object} ev - the triggering event
   * @param {string} item_id - the ID of the configuration to edit
   */
  editItem(ev, item_id) {
    let found_item = this.state.files_list.find((item) => item.id === item_id);
    if (!found_item) {
      this.displayError('Internal error prevented editing of this entry');
      console.log('Unable to edit entry with ID: ', item_id);
      return;
    }

    this.setState({mode: found_item.data_type, name: found_item.name, mode_title: 'Edit ' +  found_item.name, 
                   mode_path: found_item.location, edit_cb: this.finishEdit, edit_add: false, edit_item: found_item});
  }

  /**
   * The function called when a new file/folder entry is configured
   * @param {string|int} edit_type - the data source identifier
   * @param {string} name - the name of the new configuration
   * @param {string} path - the path of the new configuration
   * @param {is_file} bool - true indicattes the path is a file, false means that it's a folder
   * @param {Object} auth - authorization information for the data source
   */
  finishAdd(edit_type, name, path, is_file, auth) {
    let new_state = {mode: null, mode_name: '', mode_title: ''};

    const new_entry = {name, location: path, path_is_file: is_file, auth, data_type: edit_type, id: Utils.getUuid()};
    this.props.onAdd(new_entry);
    new_state.files_list = this.props.files();

    this.setState(new_state);
  }

  /**
   * Called when the user has finished browsing for files to upload to staart the upload
   */
  fileBrowsed() {
    let browse = document.getElementById('files_types_file_find');
    const selected_file = browse.files;
    browse.style.display = "none";
    if (selected_file.length > 0) {
      this.uploadHandle(selected_file);
    }
  }

  /**
   * Called when the user has finished updating a configuration
   * @param {string|int} edit_type - the data source identifier
   * @param {string} name - the name of the new configuration
   * @param {string} path - the path of the new configuration
   * @param {is_file} bool - true indicattes the path is a file, false means that it's a folder
   * @param {Object} auth - authorization information for the data source
   */
  finishEdit(edit_type, name, path, is_file, auth, item_id) {
    let new_state = {mode: null, mode_name: '', mode_title: ''};

    const new_entry = {name, location: path, path_is_file: is_file, auth, data_type: edit_type, id: item_id};
    const old_entry = this.state.files_list.find((item) => item.id === item_id);
    this.props.OnUpdate(old_entry.id, new_entry);
    new_state.files_list = this.props.files();

    this.setState(new_state);
  }

  /**
   * Returns the UI indicator for a file or folder entry
   * @param {Object} item - the fle/folder to return the UI for
   * @param {string} item.name - the name of the file or folder
   * @param {bool} item.path_is_file - true when the item represents a file, and false otherwise
   */
  generateIsFileUI(item){
    const checkmark_on = (item.path_is_file !== null && item.path_is_file !== undefined) ? item.path_is_file : null;

    let file_checkmark_classes = 'files-detail-checkmark ' + (checkmark_on ? 'files-detail-checkmark-on' : 'files-detail-checkmark-off');

    return (
      <td id={'files_detail_is_file_' + item.name} className="files-detail-item files-detail-is-file">
        {checkmark_on !== null && <div id={'files_detail_is_file_check_' + item.name} className={file_checkmark_classes} />}
      </td>
    );
  }

  /**
   * Returns the UI for uploading files and new configurations
   */
  generateNewFileUI() {
    let drag_drop_props = {};
    let upload_border_classes = 'files-types-upload-border-base';

    if (this.state.upload_count <= 0) {
      upload_border_classes += ' files-types-upload-border';
    }

    // Only be responsive if we are not uploading something already
    if (!this.state.upload_count) {
      drag_drop_props.onClick = this.browseFiles;
      drag_drop_props.draggable = 'true';
      drag_drop_props.onDragEnter = this.dragStart;
      drag_drop_props.onDrop = this.dragDrop;
      drag_drop_props.onDragOver = this.dragOver;
      drag_drop_props.onDragLeave = this.dragEnd;
    }

    return (
      <>
        <div id="files_types_upload_wrapper" className="files-types-upload-wrapper" {...drag_drop_props}>
          <div id="files_types_upload_border" className={upload_border_classes} >
            <svg version="1.1"
                 baseProfile="full"
                 width="30" height="21"
                 xmlns="http://www.w3.org/2000/svg">
              <polygon points="15 3 25 15 20 15 20 20 10 20 10 15 5 15 15 3" stroke="lightgrey" fill="white" strokeWidth="1" />
            </svg>
          </div>
          {this.state.display_uploading && this.generateUploadingUI('files_types_upload_border')}
          <input type="file" id="files_types_file_find" accept="image/*,text/*,application/*,.yaml"
                 multiple className="file-types-upload-file-pick" onChange={this.fileBrowsed}></input>
        </div>
        <div id="files_types_list_wrapper" className="files-types-list-wrapper">
          <select name="files_types" id="files_types" onChange={this.updateNewType}>
            <option value="" className="files-types-option files-type-option-item">--Please select--</option>
            {this.file_interfaces.map((item) => {return (<option value={item.id} key={item.id} className="files-types-option files-type-option-item">{item.name}</option>);}
            )}
          </select>
        </div>
        <div id="files_add_new_button_wrapper" className="files-add-new-button-wrapper">
          <span id="add_new_button" className="files-add-new-button" onClick={this.addItem}>New</span>
        </div>
      </>
    );
  }

  /**
   * Returns an indicator for when files are being uploaded
   * @param {string} parent_id - the ID of the parent element this is aligned with
   */
  generateUploadingUI(parent_id) {
    const el = document.getElementById(parent_id);
    if (!el) {
      window.setTimeout(() => {this.setState({display_uploading: this.state.display_uploading});}, 100);
      return null;
    }

    const child_id = 'files_types_uploading_info_wrapper';
    const our_el = document.getElementById(child_id);
    let props = {}

    // Position ourselves over the parent element
    if (our_el) {
      const alignment_pos = this.getRightAlignedPos(el, our_el);
      props.x = alignment_pos[0];
      props.y = alignment_pos[1];
    } else {
      // We aren't visible yet, ty again later
      window.setTimeout(() => void this.rightAlignUploadingUI(parent_id, child_id, 0), 100);
    }

    // Don't display our message until some time has elapsed
    window.setTimeout(() => void this.unhideElement(child_id), 1000);

    return (
      <div id={child_id} className="files-types-uploading-info-wrapper" {...props} >
        <div id="files_types_uploading_info" className="files-types-uploading-info">
          Uploading files...
        </div>
      </div>
    );
  }

  /**
   * Returns the X & Y screen position to right-align a child element with the parent
   * @param {string} parent_id - the element ID of the parent
   * @param {string} child_id - the element  of the child element to aligh
   */
  getRightAlignedPos(parent_el, child_el) {
    let parent_rect = parent_el.getBoundingClientRect();
    let child_rect = child_el.getBoundingClientRect();

    let x_adjust = (parent_rect.width - child_rect.width);
    let y_adjust = (parent_rect.height - child_rect.height) / 2.0;

    return [parent_rect.x + x_adjust, parent_rect.y + y_adjust];
  }

  /**
   * Returns thee title entry for the table displaying ocnfigurations
   * @param {string} item - the title to display
   * @param {int|string} idx - the index associated with the item
   */
  getTitle(item, idx) {
    if (item && (item.length > 0) && (item[0] !== '_')) {
      if (item !== ' ') {
        return (<th id={"title_" + idx} key={item} className="files-title-text">{item}</th>);
      } else {
        return (<th id={"title_" + idx} key={item + '_' + idx}></th>);
      }
    }
    return null;
  }

  /**
   * Checks for an existing configuration name
   * @returns {bool} true is returned if we're adding a configuration and the name exists, or we're editing a configuration
   * and the name already exists. A return value of false indicates a conflict
   */
  nameCheck(name) {
    const found_item = this.state.files_list.find((item) => item.name === name);
    if (this.state.edit_add) {
      return found_item === undefined;
    } else {
      return found_item !== undefined;
    }
  }

  /**
   * Handles the pressing of the back navigation button
   */
  onGoBack() {
    this.props.onDone();
  }

  /**
   * Right aligns the upload indicator UI element
   * @param {string} parent_id - the ID of the parent element to align with
   * @param {string} child_id - the ID of the child element to align with it's parent
   * @param {int} retry_count - the number of times we've tried to align the child element
   */
  rightAlignUploadingUI(parent_id, child_id, retry_count) {
    const parent_el = document.getElementById(parent_id);
    const child_el = document.getElementById(child_id);

    let child_has_size = false;
    if (child_el) {
      let child_rect = child_el.getBoundingClientRect();
      if (child_rect.width > 0) {
        child_has_size = true;
      }
    }

    if (parent_el && child_el && child_has_size === true) {
      const alignment_pos = this.getRightAlignedPos(parent_el, child_el);
      child_el.style.left = alignment_pos[0] + 'px';
      child_el.style.top = alignment_pos[1] + 'px';
    } else if (retry_count < 1000) {
      window.setTimeout(() => void this.rightAlignUploadingUI(parent_id, child_id, retry_count+1), 100);
    }
  }

  /**
   * Changes a UI element to it's initial display value - used to un-hide a hidden element
   * @param {string} el_id - the element ID to make visible
   */
  unhideElement(el_id) {
    let el = document.getElementById(el_id);
    if (!el) {
      return;
    }

    el.style.display = "initial";
  }

  /**
   * Handles the user changing tthe configuration type
   * @param {Object} ev - the triggering event
   */
  updateNewType(ev) {
    this.new_type_id = ev.target.value !== '' ? ev.target.value : null;
  }

  /**
   * Called when files have been uploaded
   * @param {Object[]} the list of uploaded files
   */
  uploadCompleted(files) {
    // TODO: report successful upload
    this.setState({upload_count: 0, display_uploading: false});
  }

  /**
   * Handles uploading of files to the server
   * @param {Object[]} files - an array of File objects to  upload
   */
  uploadHandle(files) {
    let upload_count = 0;
    let form_data = new FormData();
    for (let i = 0; i < files.length; i++) {
      let one_file = files[i];
      if (one_file.size > MAX_FILE_SIZE) {
        this.displayError('One or more files exceed the maximum allowed size of ' + (MAX_FILE_SIZE / 1024) + 'Kb');
        console.log("File too large: '" + one_file.name + "'' " + one_file.size);
        return;
    }
      form_data.append('file' + i, one_file, one_file.name);
      upload_count++;
    }

    this.upload_start_ts = Date.now();
    this.setState({upload_count, display_uploading: true})

    fetch(Utils.getHostOrigin() + '/upload', {
      method: 'PUT',
      body: form_data,
      credentials: 'include',
      }
    )
    .then(response => {if (response.ok) return response.json(); else throw response.statusText})
    .then(success => {this.uploadCompleted(success);})
    .catch(error => {
                     this.displayError('Unable to complete upload request: ' + error);
                     this.setState({upload_count: 0, display_uploading: false});
                    }
    );
  }

  /**
   * Returns thee File UI
   */
  render()  {
    const have_errors = this.state.errors !== null;

    return (
      <>
        {have_errors && <Message msg={this.state.errors} type={Message.type.warning} ok={this.dismissMessage} cancel={this.dismissMessage} />}
        <div id="files_wrapper" className="files-wrapper">
          <WorkspaceTitlebar title="Connect to files stored in a heirarchy" back={this.props.onDone} extra={this.generateNewFileUI}/>
          <table id="files_table" className="files-table">
            <thead className="files-table-titles">
              <tr>
                {files_titles.map(this.getTitle)}
              </tr>
            </thead>
            <tbody>
              {this.state.files_list.map((item) => {
                return (
                  <tr id={'files_detail_row_' + item.id} key={item.id} className="files-detail-row">
                    <td id={'files_detail_name_' + item.id} className="files-detail-item files-detail-name">{item.name}</td>
                    <td id={'files_detail_type_' + item.id} className="files-detail-item files-detail-type">{item.data_type}</td>
                    <td id={'files_detail_loc_' + item.id} className="files-detail-item files-detail-location">{item.location}</td>
                    {this.generateIsFileUI(item)}
                    <td id={'files_detail_id_' + item.id} className="files-detail-item files-detail-id">{item.id}</td>
                    <td id={'files_detail_edit_' + item.id} className="files-detail-item files-detail-edit" onClick={(ev) => this.editItem(ev, item.id)}>Edit</td>
                    <td id={'files_detail_del_' + item.id} className="files-detail-item files-detail-delete" onClick={(ev) => this.deleteItem(ev, item.id)}>Delete</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
        {this.state.mode !== null &&
            <AFilesEdit title={this.state.mode_title} source={this.state.mode} path={this.state.mode_path} edit_item={this.state.edit_item}
                        cancel={this.cancelEdit} submit={this.state.edit_cb} name_check={this.nameCheck} />}
      </>
    );
  }
}

export default AFiles;
