// Workflow interface
import {Component} from 'react';
import WorkspaceTitlebar from './WorkspaceTitlebar';
import TemplateUIElement from './TemplateUIElement';
import BrowseFolders  from './BrowseFolders';
import workflowDefinitions from './WorkflowDefinitions';
import Utils from './Utils';
import './AWorkflow.css';

// Table header names
var workflow_titles = [
  'Name',
  'Type',
  'Status',
  'ID',
  ' ',
  ' ',
];

var workflow_modes = {
  main: 0,      // List of workflows
  run: 1,       // Run a workflow
  details: 2,   // Details for running workflows
  details_finished: 3,   // Details for running workflows when the workflow has completed
};

var name_ui_def =  {
  name: 'workflow_name',
  prompt: 'Name',
  description: 'Name of workflow',
  default: '',
  type: 'plain',
  minlength: '1',
  maxlength: '100',
};

var message_types = {
  messages: 0,
  errors: 1
};

// Prefix to use for the ID of generated items
var id_prefix = 'workflow_new_item_';

// The number of times we try to find a workflow in our list
var max_find_workflow_retry_count = 5;

class AWorkflows extends Component {
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.browseFiles = this.browseFiles.bind(this);
    this.displayErrors = this.displayErrors.bind(this);
    this.displayMessages = this.displayMessages.bind(this);
    this.displayWorkflowDetailsStatus = this.displayWorkflowDetailsStatus.bind(this);
    this.fetchWorkflowDetails = this.fetchWorkflowDetails.bind(this);
    this.fetchWorkflowStatus = this.fetchWorkflowStatus.bind(this);
    this.generateDetailsPendingUI = this.generateDetailsPendingUI.bind(this);
    this.generateMessages = this.generateMessages.bind(this);
    this.generateStepUI = this.generateStepUI.bind(this);
    this.generateTitleRightUI = this.generateTitleRightUI.bind(this);
    this.generateWorkflowUI = this.generateWorkflowUI.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.handleSuccessJobStart = this.handleSuccessJobStart.bind(this);
    this.handleWorkflowStatus = this.handleWorkflowStatus.bind(this);
    this.haveRequiredWorkflowParameters = this.haveRequiredWorkflowParameters.bind(this);
    this.newIdAdded = this.newIdAdded.bind(this);
    this.onBack = this.onBack.bind(this);
    this.onCancelBrowse = this.onCancelBrowse.bind(this);
    this.onCancelEdit = this.onCancelEdit.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.onItemCheck= this.onItemCheck.bind(this);
    this.onNameChange= this.onNameChange.bind(this);
    this.onViewDetails =  this.onViewDetails.bind(this);
    this.prepareWorkflowStatus = this.prepareWorkflowStatus.bind(this);
    this.refreshMessages = this.refreshMessages.bind(this);
    this.runWorkflow = this.runWorkflow.bind(this);
    this.updateNewType = this.updateNewType.bind(this);
    this.workflowDetailsStatus = this.workflowDetailsStatus.bind(this);

    const workflow_defs = [...workflowDefinitions];

    // Setup for files and folders
    let all_files = this.props.files();
    if (!all_files) {
      all_files = [];
    }
    this.files = all_files.filter((item) => item.path_is_file === true);
    this.folders = all_files.filter((item) => item.path_is_file !== true);

    // Setup for user entered workflow data
    for (let ii = 0; ii < workflow_defs.length; ii++) {
      this.workflow_configs[workflow_defs[ii].id] = {};
    }

    // The current list of run/running workflows
    let workflow_list = this.props.workflows();
    if (!workflow_list) {
      workflow_list = [];
    }

    this.state = {
      mode: workflow_modes.main,    // The current display mode
      browse_files: null,           // Flag used to browse files, folders, or no-browse(=null)
      cur_item_index: null,         // The index of the new item to edit
      cur_item_name: null,          // The name of the new item
      cur_item_title: null,         // The title to display for the new item window
      edit_add: true,               // Flag used to determine if we're adding or editing an item
      edit_item: null,              // The item we're editing when we edit
      workflow_list,                // The list of defined workflows
      workflow_defs,                // The workflow definitions
      browse_cb: null,              // The callback to handle the users file choices
      met_requirements: false,      // Flag indicating requirements have been met
      details_job_id: null,         // The job id for when we're displaying details
      job_messages: null,           // The current list of messages
      job_errors: null,             // The current list of errors
      cur_messages: null,           // The types of messages to display
      pending_request: false,       // Flag indicaating there's a pending request - can be used when generating a UI
    };
  }

  generated_ids = [];           // IDs of all elements we generated
  mandatory_ids = [];           // IDs of mandatory elements we generated
  new_workflow_idx = null;      // The index of a new workflow to specify
  workflow_configs = {};        // The configurations for workflows
  workflow_status_timer = null; // The timer id for workflow status fetches
  workflow_details_timer = null;// The timer id when fetching workflow details
  workflow_details_status_timer = null; // The timer id when fetching workflow status while viewing details
  prepared_messages = null;     // Prepared messages for display
  prepared_errors = null;       // Prepared errors for display
  prepare_lines_timer = null;   // Timer id for preparing message/error lines for display

  componentDidMount() {
    const have_met_requirements = this.haveRequiredWorkflowParameters();
    if (this.state.met_requirements !== have_met_requirements) {
      this.setState({met_requirements: have_met_requirements});
    }
  }

  addItem() {
    if (this.new_workflow_idx == null) {
      let el = document.getElementById('workflow_types');
      el.focus();
      return;
    }
    const cur_index = this.new_workflow_idx;
    const cur_template = this.state.workflow_defs[cur_index];
    let cur_name = cur_template.name;
    const title_name = cur_name;
    if (this.workflow_configs[cur_template.id].hasOwnProperty('cur_item_name')) {
      cur_name = this.workflow_configs[cur_template.id]['cur_item_name'];
    }

    this.setState({mode: workflow_modes.run, cur_item_index: cur_index, cur_item_name: cur_name, 
                   cur_item_title: 'New ' +  title_name, edit_add: true, edit_item: null,
                   met_requirements: this.haveRequiredWorkflowParameters()});
  }

  browseFiles(ev, element_id, item) {
    this.setState({browse_files: true, browse_cb: (path, folder_type) => {this.finishBrowse(path, element_id, item, folder_type)}});
  }

  displayErrors(ev) {
    if (this.state.cur_messages !== message_types.errors) {
      this.setState({cur_messages: message_types.errors});
    }
  }

  displayMessages(ev) {
    if (this.state.cur_messages !== message_types.messages) {
      this.setState({cur_messages: message_types.messages});
    }
  }

  displayWorkflowDetailsStatus(job_id, status) {
    this.handleWorkflowStatus(job_id, status, 'workflow_details_status');
  }

  fetchWorkflowDetails(job_id) {
    // Make the request to get the messages
    const uri = Utils.getHostOrigin().concat('/workflow/messages/' + job_id);

    this.setState({pending_request: true});
    try {
      fetch(uri, {
        method: 'GET',
        credentials: 'include',
        }
      )
      .then(response => response.json())
      .then(success => {this.setState({pending_request: false});this.handleWorkflowMessages(job_id, success)})
      .catch(error => {this.setState({pending_request: false});console.log("ERROR",error);});
    } catch (err) {
      this.setState({pending_request: false});
      console.log("Fetch workflow details exception", err);
      throw err;
    }
  }

  fetchWorkflowStatus(job_id, success_cb) {
    // Make the request to get the status
    const uri = Utils.getHostOrigin().concat('/workflow/status/' + job_id);

    this.setState({pending_request: true});
    try {
      fetch(uri, {
        method: 'GET',
        credentials: 'include',
        }
      )
      .then(response => response.json())
      .then(success => {this.setState({pending_request: false});console.log("STATUS",success);success_cb(job_id, success);})
      .catch(error => {this.setState({pending_request: false});console.log("ERROR",error);});
    } catch (err) {
      this.setState({pending_request: false});
      console.log("Fetch workflow status exception", err);
      throw err;
    }
  }

  finishBrowse(file_path, el_id, item, folder_id) {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];
    const cur_folder = this.folders.find((item) => item.id === folder_id);

    if (cur_config.hasOwnProperty(item.item_save_name)) {
      cur_config[item.item_save_name].location = file_path;
      cur_config[item.item_save_name].auth = cur_folder.auth;
      cur_config[item.item_save_name].data_type = cur_folder.data_type;
    } else {
      cur_config[item.item_save_name] = {location: file_path, id: el_id, auth: cur_folder.auth,
                                         data_type: cur_folder.data_type, path_is_file: true, name: file_path};
    }

    this.setState({browse_files: null, browse_cb: null, met_requirements: this.haveRequiredWorkflowParameters()});
  }

  generateDetailsPendingUI(force) {
    // Don't display if we don't need to
    if (!force && ((this.state.job_messages !== null) || (this.state.job_errors !== null))) {
      return;
    }

    let parent_el = document.getElementById('workflow_details_details_wrapper');
    if (!parent_el) {
      parent_el = document.getElementById('workflow_details_details');
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
      <div id="workflow_details_pending_wrapper" className="workflow-details-pending-wrapper" style={wait_style}>
        <div className="workflow-details-pending-spacer"></div>
        <div id="workflow_details_pending_prompt" className="workflow-details-pending-prompt">Loading...</div>
        <div className="workflow-details-pending-spacer"></div>
      </div>
    );
  }

  generateMessages() {
    const prepared_lines = this.state.cur_messages === message_types.messages ? this.prepared_messages : this.prepared_errors;
    if (prepared_lines) {
      return prepared_lines;
    }

    const text_lines = this.state.cur_messages === message_types.messages ? this.state.job_messages : this.state.job_errors;

    if (!text_lines || (text_lines.length <= 0)) {
      return null;
    }

    if (text_lines.length < 10000) {
      const prepared_lines = text_lines.map((item, idx) => {
            const updated_string = item.replaceAll('\n', '').replaceAll('\r', '');
            return (<span key={idx}>{updated_string}<br/></span>);
      });
      if (this.state.cur_messages === message_types.messages) {
        this.prepared_messages = prepared_lines;
      } else {
        this.prepared_errors = prepared_lines;
      }

      return prepared_lines;
    }

    if (this.prepare_lines_timer === null) {
      const cur_message_type = this.state.cur_messages;
      this.prepare_lines_timer = window.setTimeout(() => {
                          const prepared_lines = text_lines.map((item, idx) => {
                                const updated_string = item.replaceAll('\n', '').replaceAll('\r', '');
                                return (<span key={idx}>{updated_string}<br/></span>);
                          });
                          if (cur_message_type === message_types.messages) {
                            this.prepared_messages = prepared_lines;
                          } else {
                            this.prepared_errors = prepared_lines;
                          }
                          this.prepare_lines_timer = null;
                          this.setState({cur_messages: this.state.cur_messages});
                  }, 100);
    }

    return this.generateDetailsPendingUI(true);
  }

  generateStepUI(parent, idx, default_values) {
    const field_lookup_prefix = idx + '_' + parent.command + '_';

    return (parent.fields.map((item) => {
        if (item['visibility'] !== 'ui') {
          return null;
        }

        let item_save_name = field_lookup_prefix + item.name;
        item.item_save_name = item_save_name;

        const found_value = default_values.hasOwnProperty(item_save_name) ? default_values[item_save_name] : null;
        if (found_value !== null) {
          item['default'] = found_value;
        }

        let props = {};
        if (item.type === 'file') {
          props['files'] = this.files;
          props['browse'] = this.browseFiles;
          if (!item.hasOwnProperty('default') && (this.files.length > 0)) {
            item['default'] = {location: this.files[0].location, id: item_save_name, auth: this.files[0].auth,
                                         data_type: this.files[0].data_type, path_is_file: true, name: this.files[0].location}
          }
        } else if (item.type === 'folder') {
          props['folders'] = this.folders;
          if (!item.hasOwnProperty('default') && (this.folders.length > 0)) {
            item['default'] = {location: this.folders[0].location, id: item_save_name, auth: this.folders[0].auth,
                                         data_type: this.folders[0].data_type, path_is_file: false, name: this.folders[0].location}
          }
        }

        return(
          <tr id={item.name + '_' + idx} key={item.name + '_' + idx}>
            <TemplateUIElement template={item} id={item_save_name} id_prefix={id_prefix} new_id={this.newIdAdded}
                               change={(ev, mapped_value) => {this.onItemCheck(ev, item_save_name, mapped_value);}} {...props}/>
          </tr>
        );
      })
    );
  }

  generateTitleRightUI() {
    return (
      <>
        <div id="workflow_types_list_wrapper" className="workflow-types-list-wrapper">
          <select name="workflow_types" id="workflow_types" onChange={this.updateNewType}>
            <option value="" className="workflow-types-option workflow-type-option-item">--Please select--</option>
            {this.state.workflow_defs.map((item, idx) => {return (
                <option value={item.name + '_' + idx} key={item.name + '_' + idx} className="workflow-types-option workflow-type-option-item">{item.name}</option>
              );}
            )}
          </select>
        </div>
        <div id="workflow_add_new_button_wrapper" className="workflow-add-new-button-wrapper">
          <span id="add_new_button" className="workflow-add-new-button" onClick={this.addItem}>New</span>
        </div>
      </>
    );
  }

  generateWorkflowUI() {
    switch (this.state.mode) {
      default:
      case workflow_modes.main:
      {
        return (
          <table id="workflow_table" className="workflow-table">
            <thead className="workflow-table-titles">
              <tr>
                {workflow_titles.map(this.getTitle)}
              </tr>
            </thead>
            <tbody>
              {this.state.workflow_list.map((item) => {
                return (
                  <tr id={'workflow_detail_row_' + item.id} key={item.id} className="workflow-detail-row">
                    <td id={'workflow_detail_name_' + item.id} className="workflow-detail-item workflow-detail-name">{item.name}</td>
                    <td id={'workflow_detail_type_' + item.id} className="workflow-detail-item workflow-detail-type">{item.workflow_type}</td>
                    <td id={'workflow_detail_status_' + item.id} className="workflow-detail-item workflow-detail-status">{item.status}</td>
                    <td id={'workflow_detail_id_' + item.id} className="workflow-detail-item workflow-detail-id">{item.id}</td>
                    <td id={'workflow_detail_messages_' + item.id} className="workflow-detail-item workflow-detail-messages" onClick={(ev) => this.onViewDetails(ev, item.id)}>View</td>
                    <td id={'workflow_detail_del_' + item.id} className="workflow-detail-item workflow-detail-delete" onClick={(ev) => this.onDeleteItem(ev, item.id)}>Delete</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        );
      }

      case workflow_modes.run:
      {
        const cur_template = this.state.workflow_defs[this.state.cur_item_index];
        const cur_values = this.workflow_configs[cur_template.id];
        const workflow_run_classes = "workflow-new-footer-run " + (this.state.met_requirements ? "" : "workflow-new-footer-disabled ");
        const workflow_click_func = this.state.met_requirements ? this.runWorkflow : null;
        let cur_name_ui = name_ui_def;
        cur_name_ui.default = this.state.cur_item_name;

        this.mandatory_check_ids = [];
        this.authentication_ids = [];

        return (
          <div id="workflow_new_wrapper" className="workflow-new_wrapper">
            <div id="workflow_new_title" className="workflow-new-title">{this.state.cur_item_title}</div>
            <table id="workflow_new_items_table" className="workflow-new-items-table">
              <tbody>
                <tr>
                  <TemplateUIElement template={cur_name_ui} id_prefix={id_prefix} new_id={this.newIdAdded} change={this.onNameChange} />
                </tr>
                {cur_template.steps.map((item, idx) => {return this.generateStepUI(item, idx, cur_values);})}
              </tbody>
            </table>
            <div id="workflow_new_footer_wrapper" className="workflow-new-footer-wrapper">
              <div id="workflow_new_footer_run" className={workflow_run_classes} onClick={workflow_click_func}>Run</div>
            </div>
          </div>
        );
      }

      case workflow_modes.details_finished:
      case workflow_modes.details:
      {
        const message_count_string = this.state.job_messages ? '(' + this.state.job_messages.length + ')' : '';
        const error_count_string = this.state.job_errors ? '(' + this.state.job_errors.length + ')' : '';
        var messages_class_names = 'workflow-details-show-item workflow-details-show-messages';
        var error_class_names = 'workflow-details-show-item workflow-details-show-errors';
        if (this.state.cur_messages === message_types.messages) {
          messages_class_names += ' workflow-details-showing';
        } else {
          error_class_names += ' workflow-details-showing';
        }

        return (
          <div id="workflow_details_wrapper" className="workflow-details-wrapper">
            <div id="workflow_details_bar_wrapper" className="workflow-details-bar-wrapper">
              <div id="workflow_details_show_messages" className={messages_class_names} onClick={this.displayMessages}>
                <div className="workflow-details-show-text-wrapper">
                  Messages <span className="details-count-item details-count-message">{message_count_string}</span>
                </div>
              </div>
              <div id="workflow_details_show_errors" className={error_class_names} onClick={this.displayErrors}>
                <div className="workflow-details-show-text-wrapper">
                  Errors <span className="details-count-item details-count-error">{error_count_string}</span>
                </div>
              </div>
              <div className="workflow-details-show-spacer"></div>
              <div id="workflow_details_status_wrapper" className="workflow-details-status-wrapper">
                <div id="workflow_details_status_prompt" className="workflow-details-status-prompt">Status:</div>
                <div id="workflow_details_status" className="workflow-details-status">---</div>
              </div>
              <div className="workflow-details-show-spacer"></div>
              <div id="workflow_details_refresh" className="workflow-details-refresh" onClick={this.refreshMessages}>Refresh</div>
            </div>
            <div id="workflow_details_details_wrapper" className="workflow-details-details-wrapper">
              <div id="workflow_details_details" className="workflow-details-details">{this.generateMessages()}</div>
            </div>
            {this.generateDetailsPendingUI()}
          </div>
        );
      }
    }
  }

  getTitle(item, idx) {
    if (item && (item.length > 0) && (item[0] !== '_')) {
      if (item !== ' ') {
        return (<th id={"title_" + idx} key={item} className="workflow-title-text">{item}</th>);
      } else {
        return (<th id={"title_" + idx} key={item + '_' + idx}></th>);
      }
    }
    return null;
  }

  handleSuccessJobStart(results, workflow_info) {
    console.log(results, workflow_info);
    workflow_info.job_id = results.id;

    // Add the job
    this.props.onAdd(workflow_info);

    // Reset the user entered data
    this.workflow_configs[workflow_info.workflow_type] = {};

    this.workflow_status_timer =  window.setTimeout(() => {this.prepareWorkflowStatus(workflow_info.id)}, 500);

    // Update the list of workflows
    this.setState({mode: workflow_modes.main, cur_item_index: null, cur_item_name: null, cur_item_title: null,
                   edit_item: null, workflow_list: this.props.workflows()});
  }

  handleWorkflowMessages(job_id, messages) {
    console.log("MESSAGES:", job_id, messages);

    // We have messages that can replace what's there
    this.prepared_messages = null;
    this.prepared_errors= null;

    this.setState({job_messages: messages.hasOwnProperty('messages') ? messages['messages'] : [],
                   job_errors: messages.hasOwnProperty('errors') ? messages['errors'] :  []});
  }

  handleWorkflowStatus(job_id, status, update_el_id) {
    console.log("Handle workflow status:", job_id, status, update_el_id);
    let cur_workflow = this.state.workflow_list.find(item => item.job_id === job_id);

    if (!cur_workflow) {
      return;
    }

    if (!status.hasOwnProperty('result')) {
      console.log('Workflow Status: unknown workflow status found', status);
      return;
    }

    let cur_status = '';
    switch (status['result']){
      case 0: cur_status = 'Starting'; break;
      case 1: 
        if (status.hasOwnProperty('status') && status['status'].hasOwnProperty('running') && status['status']['running'].hasOwnProperty('message')) {
          cur_status = status['status']['running']['message'];
        } else {
          cur_status = 'Running'; 
        }
        break;
      case 2: cur_status = 'Finished'; break;
      default: cur_status = 'unknown'; break;
    }

    cur_workflow['status'] = cur_status;

    // Update the UI
    let el = document.getElementById(update_el_id ? update_el_id : 'workflow_detail_status_'  + cur_workflow.id);
    if (!el) {
      return;
    }
    el.innerHTML = cur_status;

    if (status['result'] === 2) {
      this.setState({mode: workflow_modes.details_finished});
    }
  }

  haveRequiredWorkflowParameters() {
    const invalid_values = [null, undefined, ''];
    if (!this.mandatory_ids) {
      return false;
    }

    return (this.mandatory_ids.length > 0) && this.mandatory_ids.every((el_id) => {
      return !invalid_values.includes(document.getElementById(el_id).value)
    });
  }

  newIdAdded(item, new_id) {
    const found = this.generated_ids.find((cur_id) => cur_id === new_id);
    if (found !== undefined) {
      return;
    }

    this.generated_ids.push(new_id);
    if (item.mandatory !== false) {
      this.mandatory_ids.push(new_id);
    }
    item._ui_id = new_id;
  }

  onBack(ev) {
    if (this.state.mode === workflow_modes.main){
      this.props.onDone(ev);
    } else {
      this.setState({mode: workflow_modes.main, browse_files: null, details_job_id: null});
    }
  }

  onCancelBrowse() {
    this.setState({browse_files: null, browse_cb: null});
  }

  onCancelEdit() {
    this.setState({mode: workflow_modes.main, cur_item_index: null, cur_item_name: null, cur_item_title: null});
  }

  onDeleteItem(ev) {
  }

  onItemCheck(ev, item_save_name,  mapped_value) {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];

    if (typeof cur_config[item_save_name] === 'object') {
      if (cur_config[item_save_name].hasOwnProperty('location')) {
        cur_config[item_save_name].location = ev.target.value;
      } else {
        alert("Unknown object has been updated. Contact the developer to resolve");
      }
    } else {
      cur_config[item_save_name] =  ev.target.value;
    }
  }

  onNameChange(ev) {
    let cur_id = this.state.workflow_defs[this.new_workflow_idx].id;
    this.workflow_configs[cur_id]['cur_item_name'] = ev.target.value;

    this.setState({cur_item_name: ev.target.value});
  }

  onViewDetails(ev, workflow_id) {
    const found_item = this.state.workflow_list.find(item => item.id === workflow_id);
    if (!found_item) {
      // TODO: warning
      return;
    }

    this.job_messages = null;
    this.job_errors = null;
    this.prepared_messages = null;
    this.prepared_errors = null;

    if (this.workflow_details_timer !== null) {
      window.clearTimeout(this.workflow_details_timer);
      this.workflow_details_timer = null;
    }
    this.workflow_details_timer = window.setTimeout(() => {
                                            this.workflow_details_timer = null;
                                            this.fetchWorkflowDetails(found_item.job_id);
                                          }, 10);

    if (this.workflow_details_status_timer !== null) {
      window.clearTimeout(this.workflow_details_status_timer);
      this.workflow_details_status_timer = null;
    }
    this.workflow_details_status_timer = window.setTimeout(() => {
                                              this.workflow_details_status_timer = null;
                                              this.workflowDetailsStatus(found_item.job_id);
                                            }, 100);

    this.setState({mode: workflow_modes.details, details_job_id: found_item.job_id, cur_messages: message_types.messages});
  }

  prepareWorkflowStatus(workflow_id, retry_count) {
    if ((retry_count === undefined)|| (retry_count === null)) {
      retry_count = 0;
    }
    retry_count++;

    if (retry_count > max_find_workflow_retry_count) {
      // TODO: eport error
    }

    // Try to find the workflow, if not try again until we're done trying
    const found_workflow = this.state.workflow_list.find(item => item.id === workflow_id);
    if (found_workflow === undefined) {
      if (this.workflow_status_timer !== null) {
        window.clearTimeout(this.workflow_status_timer);
        this.workflow_status_timer = null;
      }
      this.workflow_status_timer = window.setTimeout(() => {
                                            this.workflow_status_timer = null;
                                            this.prepareWorkflowStatus(workflow_id, retry_count);
                                          }, 100);
      return;
    }

    // Make the request to get the status
    this.fetchWorkflowStatus(found_workflow.job_id, this.handleWorkflowStatus);
  }

  refreshMessages(ev) {
    // Only fetch messages if we aren't fetching them already (prevent mad clicking from causing problems)
    if (this.workflow_details_timer === null) {
      this.workflow_details_timer = window.setTimeout(() => {
                    this.workflow_details_timer = null;
                    this.fetchWorkflowDetails(this.state.details_job_id);
                  }, 10);
    }
  }

  runWorkflow() {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];
    console.log("RUN:",cur_template,cur_config,this.generated_ids);

    let values = this.generated_ids.map((el_id) => {
      let el = document.getElementById(el_id);
      if (el !== null) {
        let param_info = {id: el_id, value: el.value};
        if (el_id.startsWith(id_prefix)) {
          param_info['name'] = el_id.substring(id_prefix.length);
        } else {
          param_info['name'] = el_id.split('_').pop();
        }

        // Try to find the  element in our stored configuration values
        if (!el_id.startsWith(id_prefix)) {
          // We assume we have a workflow configuration item
          const key_parts = el_id.split('_');
          param_info['step_idx'] = parseInt(key_parts.shift());
          key_parts.pop();
          param_info['step_name'] = key_parts.join('_');

          const found_key = Object.keys(cur_config).find((id) => cur_config[id].id === el_id);
          if (found_key !== undefined) {
            param_info['config'] = cur_config[found_key];
          } else {
            let found_item = null
            for (let i = 0; i < cur_template.steps.length; i++) {
              found_item = cur_template.steps[i].fields.find((item) => item.hasOwnProperty('_ui_id') && item['_ui_id'] === el_id);
              if (found_item) {
                break;
              }
            }
            if (found_item && found_item.hasOwnProperty('default') && 
                            ((found_item['type'] === 'file') || (found_item['type'] === 'folder'))) {
              param_info['config'] = found_item['default'];
            }
          }
        }
        return param_info;
      }

      return undefined;
    });

    // Assemble the workflow JSON
    let workflow_data = {
      id: cur_template.id,
      params: [],
    };
    for (const param of values) {
      console.log("  param", param);
      let param_info = {};
      if (param.hasOwnProperty('step_idx')) {
        param_info['command'] = cur_template.steps[param.step_idx].command;
        param_info['field_name'] = param.name;
      }
      if (param.hasOwnProperty('config')) {
        param_info['auth'] = param.config.auth;
        param_info['data_type'] = param.config.data_type;
        param_info['value'] = param.config.location;
      } else {
        param_info[param.name] = param.value;
      }
      workflow_data.params.push(param_info);
    }

    const name_item = workflow_data.params.find(item => item.hasOwnProperty('workflow_name'));
    let workflow_info = {id: Utils.getUuid(), name: name_item ? name_item['workflow_name'] : '',
                         workflow_type: workflow_data.id, job_id: null}

    const uri = Utils.getHostOrigin().concat('/workflow/start');
    try {
      fetch(uri, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(workflow_data)
        }
      )
      .then(response => response.json())
      .then(success => {this.handleSuccessJobStart(success, workflow_info);})
      .catch(error => console.log("ERROR",error));
    } catch (err) {
      console.log("Run workflow exception", err);
      throw err;
    }
  }

  updateNewType(ev) {
    const target_val = ev.target.value;

    if (!target_val || (target_val.length <= 0)) {
      this.new_workflow_idx = null;
      return;
    }

    let found_idx = this.state.workflow_defs.findIndex((item, idx) => item.name + '_' + idx === target_val);
    this.new_workflow_idx = found_idx >= 0 ? found_idx : null;
  }

  workflowDetailsStatus(job_id) {
    this.fetchWorkflowStatus(job_id, 
              (job_id, success) => {
                this.displayWorkflowDetailsStatus(job_id, success);
                if (this.state.mode === workflow_modes.details) {
                  this.workflow_details_status_timer = window.setTimeout(() => {
                                                            this.workflow_details_status_timer = null;
                                                            this.workflowDetailsStatus(job_id);
                                                          }, 5000);
                }
              });
  }

  render() {
    const viewing_details = (this.state.mode === workflow_modes.details) || (this.state.mode === workflow_modes.details_finished);
    const title_right_generator = !viewing_details ? this.generateTitleRightUI : null;

    return (
      <>
        <div id="workflow_wrapper" className="workflow-wrapper">
          <WorkspaceTitlebar title="Manage image-based workflows" back={this.onBack} extra={title_right_generator}/>
          {this.generateWorkflowUI()}
        </div>
        {this.state.browse_files === true && <BrowseFolders folders={this.folders} selected={this.state.browse_cb} cancel={this.onCancelBrowse}/>}
      </>
    );
  }
}

export default AWorkflows;
