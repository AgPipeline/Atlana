//Implementation of file system interface
import { Component } from 'react';
import FileInterfaces from './FileInterfaces';
import Message from './Message';
import IData from './data/IData';
import './AFilesEdit.css';

// The order of these fields is important, see titleSortInd() and title_sort_map
var file_display_titles = ['Name', 'Timestamp', 'Size'];
var sort_column_id = {
  name: 1,
  date: 2,
  size: 3,
};
// Map the index of a title to the sort_column_id
var title_sort_map = {0: sort_column_id.name, 1: sort_column_id.date, 2: sort_column_id.size};

class AFilesEdit extends Component {
  constructor(props) {
    super(props);

    this.connectRequestCatch = this.connectRequestCatch.bind(this);
    this.connectRequestFinish = this.connectRequestFinish.bind(this);
    this.connectRequestStart = this.connectRequestStart.bind(this);
    this.dismissMessage = this.dismissMessage.bind(this);
    this.displayContents = this.displayContents.bind(this);
    this.displayError = this.displayError.bind(this);
    this.displayDisabledResults = this.displayDisabledResults.bind(this);
    this.displayFetchWait = this.displayFetchWait.bind(this);
    this.displayPathItem = this.displayPathItem.bind(this);
    this.fetchRequestCatch = this.fetchRequestCatch.bind(this);
    this.fetchRequestError = this.fetchRequestError.bind(this);
    this.fetchRequestFinish = this.fetchRequestFinish.bind(this);
    this.fetchRequestStart = this.fetchRequestStart.bind(this);
    this.generateInterfaceItem = this.generateInterfaceItem.bind(this);
    this.generateInterfaceUI = this.generateInterfaceUI.bind(this);
    this.getAuthenticationFields = this.getAuthenticationFields.bind(this);
    this.handleDocumentKey = this.handleDocumentKey.bind(this);
    this.handleGoButton = this.handleGoButton.bind(this);
    this.handlePathKey = this.handlePathKey.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onMandatoryCheck = this.onMandatoryCheck.bind(this);
    this.onNameUpdated = this.onNameUpdated.bind(this);
    this.onOk = this.onOk.bind(this);
    this.onPathUpdated = this.onPathUpdated.bind(this);
    this.sortByDate = this.sortByDate.bind(this);
    this.sortByName = this.sortByName.bind(this);
    this.sortBySize = this.sortBySize.bind(this);
    this.sortResults = this.sortResults.bind(this);
    this.titleClicked = this.titleClicked.bind(this);
    this.titleSortInd = this.titleSortInd.bind(this);
    this.verifyMandatoryFieldsFilled = this.verifyMandatoryFieldsFilled.bind(this);

    this.interface = FileInterfaces.getInterface(props.source);
    this.interface_info = this.interface.initialize();

    let cur_path = this.props.path ? this.props.path : '/';
    let cur_name = this.props.edit_item ? this.props.edit_item.name : this.interface_info.name;

    this.state = {
      cur_path: cur_path,               // Current working path
      fetching: false,                  // Convenience flag for UI updates
      path_contents: null,              // Folder contents
      name: cur_name,                   // Working name of definition
      mandatory_fields_filled: false,   // Indicates mandatory fields have been filled out
      sort_column: sort_column_id.name, // Current column being sorted on
      sort_ascending: true,             // Flag for sort direction
      authentication_changed: false,    // Indicates when a mandatory authentication field has changed, reset when a connection is successful
      errors: null,
    }
  }

  connected = false;          // Flag used to determine if we're connected
  pending_fetch = null;       // Current pending request
  pending_fetch_id = 1;       // The ID of the current pending fetch
  authentication_ids = [];    // IDs of authentication elements
  mandatory_check_ids = [];   // IDs of elements that need checks for mandatory values

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

  componentWillUnmount() {
    document.removeEventListener('keydown',  this.handleDocumentKey, false);

    let el = document.getElementById('file_edit_path_edit');
    if (el) {
      el.removeEventListener("keydown", this.handlePathKey, false);
    }
  }

  connectRequestCatch(err) {
    console.log('Error: File connect error: ', err);
    this.connectRequestError(err.message);
  }

  connectRequestError(msg) {
    this.displayError(msg);
    this.pending_fetch = null;
    this.setState({fetching: false});
  }

  connectRequestFinish(request_id, results, finish_cb) {
    console.log("connectRequestFinish", results);
    // Ignore finished requests that are not us
    if (this.pending_fetch_id !== request_id + 1) {
      return;
    }

    // Remove pending status, indicate we're connected, and update state
    const returned_path = results && results.hasOwnProperty('path') ? results['path'].replaceAll('\\', '/') : '/';
    this.pending_fetch = null;
    this.connected = true;
    this.setState({fetching: false, cur_path: returned_path, path_contents: null, authentication_changed: false});

    // If there's a callback, call it later to allow stuff to update
    if (finish_cb && (typeof finish_cb === 'function')) {
      window.setTimeout(() => {finish_cb(returned_path)}, 1);
    }
  }

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

  dismissMessage() {
    this.setState({errors: null});
  }

  fetchRequestCatch(err) {
    console.log('Error: file fetch error: ', err);
    this.fetchRequestError(err.message);
  }

  fetchRequestError(msg) {
    this.displayError(msg);
    this.pending_fetch = null;
    this.setState({fetching: false});
  }

  fetchRequestFinish(request_id, path, results) {
    console.log("fetchRequestFinish",request_id, path, results);
    // Ignore finished requests that are not us
    if (this.pending_fetch_id !== request_id + 1) {
      return;
    }

    // Remove pending status  and update state
    this.pending_fetch = null;
    this.setState({fetching: false, cur_path: path.replaceAll('\\', '/'),
                   path_contents: this.sortResults(this.normalizeResults(results), this.state.sort_column, this.state.sort_ascending)});
  }

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
              {file_display_titles.map((title, idx) => {
                  let indicator = this.titleSortInd(title, this.state.sort_ascending);
                  return(<th key={'file_edit_path_contents_table_' + title} className="file-edit-path-contents-table-header">
                      <div id={'file_edit_path_contents_table_title_wrapper_' + title} className="file-edit-path-contents-table-title-wrapper" 
                           onClick={(ev) => this.titleClicked(ev, title)}>
                        <div id={'file_edit_path_contents_table_title_text_' + idx} className="file-edit-path-contents-table-title-text" >{title}</div>
                        <div id={'file_edit_path_contents_table_title_ind_' + idx} 
                             className="file-edit-path-contents-table-title-indicator" >{indicator}</div>
                      </div>
                    </th>
                  );
              })}
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

  displayDisabledResults() {
    return this.displayResultsOverlay('', 'file-edit-path-display-disabled');
  }

  displayError(msg) {
    console.log("ERROR", msg);
    this.setState({errors: msg});
  }

  displayFetchWait() {
    return this.displayResultsOverlay('Waiting...', 'file-edit-path-display-wait');
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

    wait_style['left'] = client_rect.x;
    wait_style['top'] = client_rect.y;
    wait_style['width'] = client_rect.width;
    wait_style['height'] = client_rect.height;

    return (
      <div id="file_edit_path_display_overlay_wrapper" className={'file-edit-path-display-overlay-wrapper ' + additional_class_names} style={wait_style}>
        {msg && (msg.length > 0) && <span style={{flex:1}}>{msg}</span>}
      </div>
    );
  }

  generatePlainUI(item) {
    var props = {};
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_dropdown = item.hasOwnProperty('choices');
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;

    if (!is_dropdown) {
      const element_id = 'file_edit_interface_table_value_' + item.name;
      this.authentication_ids.push(element_id);

      if (min_length) props['minlength'] = '' + min_length;
      if (max_length) props['maxlength'] = '' + max_length;
      if (item.hasOwnProperty('default')) {
        props['defaultValue'] = item.default;
      }
      if (is_mandatory) {
        props['onChange'] = this.onMandatoryCheck;
        this.mandatory_check_ids.push(element_id);
      }

      return (
        <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
          <input id={element_id} type="text" size="50" className="file-edit-interface-table-value" {...props}></input>
          {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
        </div>
      );
    } else {
      const element_id = 'file_edit_interface_table_' + item.name;
      this.authentication_ids.push(element_id);

      if (item.hasOwnProperty('default')) {
        props['defaultValue'] = item.default;
      }
      if (is_mandatory) {
        props['onChange'] = this.onMandatoryCheck;
        this.mandatory_check_ids.push(element_id);
      }

      return (
        <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
          <select id={element_id} {...props}>
            {item.choices.map((value) => {return(<option key={item.name + '.' + value} value={value}>{value}</option>);})}
          </select>
          {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
        </div>
      );
    }
  }

  generateSecretUI(item) {
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = 'file_edit_interface_table_value_' + item.name;
    this.authentication_ids.push(element_id);

    var props = {};
    if (min_length) props['minlength'] = '' + min_length;
    if (max_length) props['maxlength'] = '' + max_length;
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
    }
    if (is_mandatory) {
      props['onChange'] = this.onMandatoryCheck;
      this.mandatory_check_ids.push(element_id);
    }

    return (
      <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
        <input id={element_id} type="password" className="file-edit-interface-table-value" {...props}></input>
        {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
      </div>
    );
  }

  generatePasswordUI(item) {
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = 'file_edit_interface_table_value_' + item.name;
    this.authentication_ids.push(element_id);

    // TODO: Add checkbox for showing password in plain text
    var props = {};
    if (min_length) props['minlength'] = '' + min_length;
    if (max_length) props['maxlength'] = '' + max_length;
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
    }
    if (is_mandatory) {
      props['onChange'] = this.onMandatoryCheck;
      this.mandatory_check_ids.push(element_id);
    }

    return (
      <div id="file_edit_interface_table_value_wrapper" className="file-edit-interface-table-value-wrapper">
        <input id={element_id} type="password" className="file-edit-interface-table-value" {...props}></input>
        {is_mandatory && <span className="file-edit-interface-table-value-mandatory">*</span>}
      </div>
    );
  }

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

  getAuthenticationFields() {
    let fields = {};

    this.authentication_ids.every((el_id) => {
      let el = document.getElementById(el_id);
      if (el) {
        let val = el.value;
        let name = this.mapAuthenticationIdToName(el_id);

        if (name && val && (name.length > 0)) {
          fields[name] = val;
        }
      }

      return  true;
    });

    return fields;
  }

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

  handleGoButton() {
    let path_el = document.getElementById('file_edit_path_edit');
    console.log("GO");

    if (path_el && path_el.value) {
      if (this.connected === false || this.state.authentication_changed) {
        console.log("  CONNECT");
        this.connectRequestStart(() => this.fetchRequestStart(path_el.value));
      } else {
        console.log("  ASK");
        this.fetchRequestStart(path_el.value);
      }
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

  mapAuthenticationIdToName(el_id) {
    return el_id.substr('file_edit_interface_table_value_'.length);
  }

  normalizeResults(results) {
    if (results) {
      for (let ii = 0; ii < results.length; ii++) {
        results[ii]['lower_name'] = results[ii]['name'].toLowerCase();
        results[ii]['size'] = results[ii]['size'] ? parseInt(results[ii]['size']) : 0;

        if (results[ii].hasOwnProperty('date')) {
          let cleaned_date = results[ii]['date'];
          while (cleaned_date.indexOf('  ') !== -1)  {
            cleaned_date.replaceAll('  ',' ');
          }
          results[ii]['date'] = cleaned_date;
        } else {
          results[ii]['date'] = '';
        }
      }
    }
    return results;
  }

  onCancel() {
    this.props.cancel(this.props.source);
  }

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
      new_state['mandatory_fields_filled'] = res;
    }

    this.setState(new_state);
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

    if (!this.verifyMandatoryFieldsFilled()) {
      this.displayError("Please fill in all mandatory fields and try again");
      return;
    }

    if (this.props.hasOwnProperty('name_check')) {
      if (!this.props.name_check(name)) {
        this.displayError("Duplicate or invalid name found. Please rename and try again.");
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

    this.props.submit(this.props.source, name, path, this.getAuthenticationFields(), item_id);
  }

  onPathUpdated(ev) {
    this.setState({cur_path: ev.target.value});
  }

  sortByDate(first, second, sort_asc) {
    // Handle empty dates by putting them at the end
    if (first.date.length <= 0) {
      return second.date.length > 0 ? (sort_asc ? 1 : -1) : 0;
    } else if (second.date.length <= 0) {
      return (sort_asc ? -1 : 1);
    }

    const first_parts = first.date.replace(' ', '-').replace(':', '-').split('-');
    const second_parts = second.date.replace(' ', '-').replace(':', '-').split('-');

    // Return at the first sign of differences
    for (let ii = 0; ii < first_parts.length; ii++) {
      // Proceed with date comparisons
      if (ii < second_parts.length) {
        if (first_parts[ii] < second_parts[ii]) {
          return sort_asc ? -1 : 1;
        } else if (first_parts[ii] > second_parts[ii]) {
          return sort_asc ? 1 : -1;
        }
      } else {
        // For some reason the second date has fewer parts
        return 1;
      }
    }

    // So far the timestamps are equal
    return first_parts === second_parts ? 0 : -1;
  }

  sortByName(first, second, sort_asc) {
    const lf = first['lower_name'];
    const ls = second['lower_name'];

    if (lf < ls) {
      return sort_asc ? -1 : 1;
    }
    else if (lf > ls) {
      return sort_asc ? 1 : -1;
    }
    else return 0;
  }

  sortBySize(first, second, sort_asc) {
    // Sort so that folders are at the end, sort folders by name
    if (first.type === 'folder') {
      if (second.type === 'folder') {
        return this.sortByName(first, second, sort_asc);
      } else {
        return sort_asc ? 1 : -1;
      }
    } else if (second.type === 'folder') {
      return sort_asc ? -1 : 1;
    } else {
      if (parseInt(first.size) === parseInt(second.size)) {
        return 0;
      } else if (first.size < second.size) {
        return sort_asc ? -1 : 1;
      } else {
        return sort_asc ? 1 : -1;
      }
    }
  }

  sortResults(results, sort_column, sort_ascending) {
    const sort_asc = !(sort_ascending === false);   // Normalize for missing or non-boolean value

    switch (sort_column) {
      default:
      case sort_column_id.name:
        return results.sort((first, second) => this.sortByName(first, second, sort_asc));

      case sort_column_id.size:
        return results.sort((first, second) => this.sortBySize(first, second, sort_asc));

      case sort_column_id.date:
        return results.sort((first, second) => this.sortByDate(first, second, sort_asc));
    } 
  }

  titleClicked(ev, title) {
    const found_idx = file_display_titles.findIndex((item) => item === title);

    if (found_idx >= 0) {
      if (this.state.sort_column === title_sort_map[found_idx]) {
        const sorted_results = this.sortResults(this.state.path_contents, this.state.sort_column, !this.state.sort_ascending);
        this.setState({sort_ascending: !this.state.sort_ascending, path_contents: sorted_results});
      } else {
        const sorted_results = this.sortResults(this.state.path_contents, title_sort_map[found_idx], true);
        this.setState({sort_column: title_sort_map[found_idx], sort_ascending: true, path_contents: sorted_results})
      }
    }
  }

  titleSortInd(title, sort_asc) {
    const found_idx = file_display_titles.findIndex((item) => item === title);

    if (found_idx >= 0) {
      if (this.state.sort_column === title_sort_map[found_idx]) {
        if (sort_asc) {
          return "\u2227";  // Up caret
        } else {
          return "\u2228";  // Down caret
        }
      }
    }

    return " ";
  }

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

  render() {
    const cur_path = this.state.cur_path;
    const cur_name = this.state.name;
    const missing_data = !this.state.mandatory_fields_filled;
    const go_button_classes = 'file-edit-path-edit-go ' + (missing_data ? 'file-edit-path-edit-go-disabled' : '');
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
          <span className="file-edit-interface-table-value-mandatory">*</span>
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
          {this.state.path_contents && this.displayContents()}
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