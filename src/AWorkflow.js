/**
 * @fileoverview Workflow management interface
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import WorkspaceTitlebar from './WorkspaceTitlebar.js';
import TemplateUIElement from './TemplateUIElement.js';
import BrowseFolders  from './BrowseFolders.js';
import workflowDefinitions from './WorkflowDefinitions.js';
import Message from './Message.js';
import Utils from './Utils.js';
import './AWorkflow.css';

/**
 * Table header names for listing workflows
 */
var workflow_titles = [
  'Name',
  'Type',
  'Status',
  'Started',
  'ID',
  ' ',
  ' ',
  ' ',
];

/**
 * Different workflow modes (states)
 */
var workflow_modes = {
  main: 0,              // List of workflows
  run: 1,               // Run a workflow
  details: 2,           // Details for running workflows
  details_finished: 3,  // Details for running workflows when the workflow has completed
  new_workflow: 4,      // User creating a new workflow
  replace_algorithm: 5, // An algorithm is getting replacecs
};

/**
 * UI entry for a workflow's name
 */
var name_ui_def =  {
  name: 'workflow_name',
  prompt: 'Name',
  description: 'Name of workflow',
  default: '',
  type: 'plain',
  minlength: '1',
  maxlength: '100',
};

/**
  * UI Entries for Algorithm selection
  */
var algo_sel_ui_def = [
{
  name: 'repo_url',
  prompt: 'Repository URL',
  description: 'The URL of the repository to access',
  default: '',
  type: 'plain'
}
];
var algo_new_ui_def = [
{
  name: 'algo_name',
  prompt: 'Algorithm name',
  description: 'The name of this algorithm',
  default: '',
  type: 'plain'
}, {
  name: 'algo_description',
  prompt: 'Algorithm description',
  description: 'Describe the algorithm',
  default: '',
  type: 'plain'
}

];

/**
 * Used to keep track of what user want's to see
 */
var message_types = {
  messages: 0,
  errors: 1
};

/**
 * Different job status values
 */
var job_status = {
  started: 0,
  running: 1,
  completed: 2,
};

/**
 * Prefix to use for the ID of generated items
 */
var id_prefix = 'workflow_new_item_';

/**
 * The number of times we try to find a workflow in our list
 */
var max_find_workflow_retry_count = 5;

/**
 * Maximum size of a workflow file to upload
 */
var MAX_FILE_SIZE = 100*1024

/**
 * Our target uploaded workflow version
 */
var WORKFLOW_CURRENT_VERSION = '1.0'

/**
 * Implements the UI for running workflows
 * @extends Component
 */
class AWorkflow extends Component {

  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.browseFiles = this.browseFiles.bind(this);
    this.browseGit = this.browseGit.bind(this);
    this.browseUploadFiles = this.browseUploadFiles.bind(this);
    this.dismissMessage = this.dismissMessage.bind(this); // Handles dismissing popup messages
    this.displayWorkflowDetailsStatus = this.displayWorkflowDetailsStatus.bind(this);
    this.displayWorkflowErrors = this.displayWorkflowErrors.bind(this); // Displays the errors for a running workflow
    this.displayWorkflowMessages = this.displayWorkflowMessages.bind(this); // Displays the messages for a running workflow
    this.dragDrop = this.dragDrop.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
    this.dragOver = this.dragOver.bind(this);
    this.dragStart = this.dragStart.bind(this);
    this.fetchWorkflowDetails = this.fetchWorkflowDetails.bind(this);
    this.fetchWorkflowStatus = this.fetchWorkflowStatus.bind(this);
    this.fileBrowsed = this.fileBrowsed.bind(this);
    this.generateDetailsPendingUI = this.generateDetailsPendingUI.bind(this);
    this.generateDownloadUI = this.generateDownloadUI.bind();
    this.generateMessages = this.generateMessages.bind(this); // Returns the UI for displaying workflow messages
    this.generateNewWorkflowUI = this.generateNewWorkflowUI.bind(this);
    this.generateStepUI = this.generateStepUI.bind(this);
    this.generateTitleRightUI = this.generateTitleRightUI.bind(this);
    this.generateWorkflowUI = this.generateWorkflowUI.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.handleSuccessJobStart = this.handleSuccessJobStart.bind(this);
    this.handleWorkflowStatus = this.handleWorkflowStatus.bind(this);
    this.haveRequiredWorkflowParameters = this.haveRequiredWorkflowParameters.bind(this);
    this.newIdAdded = this.newIdAdded.bind(this); //Called when UI elements are generated
    this.newWorkflow = this.newWorkflow.bind(this);
    this.onAlgoChange = this.onAlgoChange.bind(this);
    this.onAlgoCheckRepo = this.onAlgoCheckRepo.bind(this);
    this.onAlgoInfoChange = this.onAlgoInfoChange.bind(this);
    this.onAlgoNewId = this.onAlgoNewId.bind(this);
    this.onBack = this.onBack.bind(this);
    this.onCancelBrowse = this.onCancelBrowse.bind(this);
    this.onDeleteItem = this.onDeleteItem.bind(this);
    this.onDownloadItem = this.onDownloadItem.bind(this);
    this.onItemCheck= this.onItemCheck.bind(this);
    this.onNameChange= this.onNameChange.bind(this);
    this.onNewWorkflowName = this.onNewWorkflowName.bind(this);
    this.onNewWorkflowSave = this.onNewWorkflowSave.bind(this);
    this.onReplaceAlgorithm = this.onReplaceAlgorithm.bind(this);
    this.onReplaceAlgoCancel = this.onReplaceAlgoCancel.bind(this);
    this.onReplaceAlgoOK = this.onReplaceAlgoOK.bind(this);
    this.onViewDetails =  this.onViewDetails.bind(this);
    this.prepareWorkflowStatus = this.prepareWorkflowStatus.bind(this);
    this.refreshWorkflowMessages = this.refreshWorkflowMessages.bind(this);
    this.runWorkflow = this.runWorkflow.bind(this);
    this.setupRunWorkflow = this.setupRunWorkflow.bind(this); // Handles running a workflow
    this.showDownloadOptions = this.showDownloadOptions.bind(this);
    this.updateNewWorkflowType = this.updateNewWorkflowType.bind(this);
    this.updateWorkflowType = this.updateWorkflowType.bind(this);
    this.workflowDetailsStatus = this.workflowDetailsStatus.bind(this);
    this.workflowStatus = this.workflowStatus.bind(this);

    // Define class variable fields
    this.generated_ids = [];            // IDs of all elements we generated
    this.mandatory_ids = [];            // IDs of mandatory elements we generated
    this.run_workflow_idx = null;       // The index of a workflow to run (index into our state.workflow_defs)
    this.workflow_configs = {};         // The configurations for workflows (values associated with different workflow defs)
    this.workflow_status_timer = null;  // The timer id for workflow status fetches
    this.workflow_details_timer = null; // The timer id when fetching workflow details
    this.workflow_details_status_timer = null; // The timer id when fetching workflow status while viewing details
    this.prepared_messages = null;      // Prepared messages for display
    this.prepared_errors = null;        // Prepared errors for display
    this.prepare_lines_timer = null;    // Timer id for preparing message/error lines for display
    this.algo_repo_conn_id_map = {};    // Contains the ID  map for algorithm repository connection information

    // Make a copy of the workflow definitions so we can manupulate them without affecting the originals
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

    // Initializing our state variables
    this.state = {
      mode: workflow_modes.main,    // The current display mode
      browse_files: null,           // Flag used to browse files, folders, or no-browse(=null)
      cur_algo_type: null,          // The current algorithm type that's getting replaced
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
      new_workflow_idx: null,       // The index of a new workflow to specify (index into our state.workflow_defs)
      new_workflows: [],            // Contains information on new workflows
      errors: null,                 // Error information
      algo_new_name: null,          // The name of a new algorithm
      algo_repo_branches: [],       // Information on the algorithm repo's branches and tags
      algo_repo_id: null,           // The server ID associated with the algorithm repo
      algo_step_idx: null,      // The index of the step the algorithm is getting changed
      replace_algo_checked: false,  // Indicates the algorithm was checked
    };
  }

  /**
   * React component mounted event handler
   */
  componentDidMount() {
    const have_met_requirements = this.haveRequiredWorkflowParameters();
    if (this.state.met_requirements !== have_met_requirements) {
      this.setState({met_requirements: have_met_requirements});
    }
  }

  componentDidUpdate(prev_props) {
    const have_met_requirements = this.haveRequiredWorkflowParameters();
    if (this.state.met_requirements !== have_met_requirements) {
      this.setState({met_requirements: have_met_requirements});
    }
  }

  /**
   * React component pre-unmount event handler
   */
  componentWillUnmount() {
    [this.workflow_status_timer, this.workflow_details_timer, this.workflow_details_status_timer, this.prepare_lines_timer]
          .forEach((timer_id) => {
                                  if ((timer_id !== null) && (timer_id !== undefined)) {
                                    window.clearTimeout(timer_id);
                                  }
                                 }
                  );
  }

  /**
   * Called to confirm that we have everything needed to define a new algorithm
   * @returns {bool} true if everything has been defined
   */
  algoHaveRepoBranch() {
    if (!this.algoHaveRepoInfo() || !this.state.replace_algo_checked) {
      return false;
    }

    let branch_el = document.querySelector('input[name=algo_repo_branch]:checked');
    if (!branch_el) {
      return false;
    }

    return true;
  }

  /**
   * Called to confirm that we have the repository connection information for an algorithm
   * @returns {bool} true if IDs have been defined and each of their elements contains a value
   */
  algoHaveRepoInfo() {
    const algo_ids = Object.values(this.algo_repo_conn_id_map);

    if (algo_ids.length <= 0) {
      return false;
    }
    const have_all_info = algo_sel_ui_def.every((item) => {
      const id = this.algo_repo_conn_id_map[item.name];
      const el = document.getElementById(id);
      return el && el.value.trim().length > 0;
    });

    return have_all_info;
  }

  /**
   * Display the configured data sources window when configuring workflows
   * @param {Object} ev - the triggeering event
   * @param {string} element_id - the ID of the element to browse for
   * @param {Object} item - the field information 
   */
  browseFiles(ev, element_id, item) {
    this.setState({browse_files: true, browse_cb: (path, folder_type) => {this.finishBrowse(path, element_id, item, folder_type)}});
  }

  /**
   * Called to browse Git repository
   */
  browseGit() {

  }

  /**
   * Called to display the local file system browser window
   */
  browseUploadFiles() {
    let browse = document.getElementById('workflow_types_file_find');
    browse.value = null;
    browse.style.display = "default";
    browse.click();
  }

  /**
   * Called when the user dismisses an popup message
   * @param {Object} ev - the triggering event
   */
  dismissMessage(ev) {
    this.setState({errors: null});
  }

  /**
   * Displays the current workflow status when viewing a running workflow
   * @param {string} job_id - the identifier of the job being updated
   * @param {Object} status - the status of the job as returned from the server
   */
  displayWorkflowDetailsStatus(job_id, status) {
    const cur_status = this.handleWorkflowStatus(job_id, status, 'workflow_details_status');

    if (cur_status === job_status.completed) {
      this.setState({mode: workflow_modes.details_finished});
    }
  }

  /**
   * Displays the errors for a running workflow
   * @param {Object} ev - the triggering event
   */
  displayWorkflowErrors(ev) {
    if (this.state.cur_messages !== message_types.errors) {
      this.setState({cur_messages: message_types.errors});
    }
  }

  /**
   * Displays the meessages for a running workflow
   * @param {Object} ev - the triggering event
   */
  displayWorkflowMessages(ev) {
    if (this.state.cur_messages !== message_types.messages) {
      this.setState({cur_messages: message_types.messages});
    }
  }

  /**
   * Handles dropped files by sending them to the server for further processsing
   * @param {Object} ev - the triggering event
   */
  dragDrop(ev) {
    let el = document.getElementById('workflow_types_upload_border');

    if (el) {
      el.classList.remove('workflow-types-upload-border-active');
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
   * Removes UI indicators when a drag operation is completed
   * @param {Object} ev - the triggering event
   */
  dragEnd(ev) {
    let el = document.getElementById('workflow_types_upload_border');

    if (el) {
      el.classList.remove('workflow-types-upload-border-active');
    }

    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * Enables UI indicators when a drag operation is over the element
   * @param {Object} ev - the triggering event
   */
  dragOver(ev) {
    let el = document.getElementById('workflow_types_upload_border');

    if (el) {
      el.classList.add('workflow-types-upload-border-active');
    }

    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * Called when a drag operation starts
   * @param {Object} ev - the triggering event
   */
  dragStart(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  /**
   * Retreives a workflow's messages and errors
   * @param {string} job_id - the ID of the job to query
   */
  fetchWorkflowDetails(job_id) {
    // Make the request to get the messages
    const uri = Utils.getHostOrigin().concat('/workflow/messages/' + encodeURI(job_id));

    let el = document.getElementById('workflow_details_refresh');
    if (el) {
      el.classList.add('workflow-details-refresh-pending');
    }
    let reset_el = () => void el.classList.remove('workflow-details-refresh-pending');
    
    this.setState({pending_request: true});
    try {
      fetch(uri, {
        method: 'GET',
        credentials: 'include',
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText;})
      .then(success => {this.setState({pending_request: false});this.handleWorkflowMessages(job_id, success);reset_el();})
      .catch(error => {reset_el(); this.setState({pending_request: false});console.log("ERROR",error);});
    } catch (err) {
      reset_el();
      this.setState({pending_request: false});
      console.log("Fetch workflow details exception", err);
      throw err;
    }
  }

  /**
   * @callback AWorkflow~WorkflowStatusCallback
   * @param {string} job_id - the ID of the job the status is related to
   * @param {Object} status - the status of the job
   */

  /**
   * Retrieves the status of the workflow
   * @param {string} job_id - the ID of the job to get the status of
   * @param {AWorkflow~WorkflowStatusCallback} success_cb - the callback function for handling the job status query results
   */
  fetchWorkflowStatus(job_id, success_cb) {
    // Make the request to get the status
    const uri = Utils.getHostOrigin().concat('/workflow/status/' + encodeURI(job_id));

    this.setState({pending_request: true});
    try {
      fetch(uri, {
        method: 'GET',
        credentials: 'include',
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText})
      .then(success => {this.setState({pending_request: false});success_cb(job_id, success);})
      .catch(error => {this.setState({pending_request: false});console.log("ERROR",error);});
    } catch (err) {
      this.setState({pending_request: false});
      console.log("Fetch workflow status exception", err);
      throw err;
    }
  }

  /**
   * Called when the user has completed browsing for files to upload, and starts the upload process
   */
  fileBrowsed() {
    let browse = document.getElementById('workflow_types_file_find');
    const selected_file = browse.files;
    browse.style.display = "none";
    if (selected_file.length > 0) {
      this.uploadHandle(selected_file);
    }
  }

  /**
   * Handles finishing browsing for files on a remote data sources by saving the information and starting a UI update
   * @param {string} file_path - the path to the user selected file
   * @param {string} el_id - the element ID associated with the browsing
   * @param {Object} item - the data field associated with the browsing request
   * @param {string} folder_id - the ID of the remote data source the user chose from
   */
  finishBrowse(file_path, el_id, item, folder_id) {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];
    const cur_folder = this.folders.find((item) => item.id === folder_id);

    if (cur_config[item.item_save_name] !== undefined) {
      cur_config[item.item_save_name].location = file_path;
      cur_config[item.item_save_name].auth = cur_folder.auth;
      cur_config[item.item_save_name].data_type = cur_folder.data_type;
    } else {
      cur_config[item.item_save_name] = {location: file_path, id: el_id, auth: cur_folder.auth,
                                         data_type: cur_folder.data_type, path_is_file: true, name: file_path};
    }

    this.setState({browse_files: null, browse_cb: null, met_requirements: this.haveRequiredWorkflowParameters()});
  }

  /**
   * Generates the UI for selection an algorithm repository branch
   * Note: assumes it's an entire row in a table
   */
  generateAlgorithmBranchUI() {
    // Generate the UI only if we have something to show
    if (!this.state.algo_repo_branches || (this.state.algo_repo_branches.length <= 0)) {
      return null;
    }

    // Return the list of branches with a radio button for each
    let default_branch_name = this.state.algo_repo_branches[0];
    if (this.state.algo_repo_branches.length > 1) {
      const main_branch = this.state.algo_repo_branches.find(branch_name => branch_name === 'master' || branch_name === 'main');
      if (main_branch) {
        default_branch_name = main_branch;
      }
    }

    return (
      <tr>
        <td>
          <div id="workflow_new_fields_branch_wrapper" className="workflow-new-fields-branch-wrapper">
            <span>Select branch</span>
            <div id="workflow_new_fields_branch_names_wrapper" className="workflow-new-fields-branch-names-wrapper">
              {this.state.algo_repo_branches.map((branch_name) => {
                let props = {}
                if (branch_name === default_branch_name) {
                  props['defaultChecked'] = true;
                }
                return (
                  <div key={branch_name}>
                    <input type="radio" id={'workflow_new_fields_branch_' + branch_name} name="algo_repo_branch" value={branch_name} {...props}></input>
                    <label htmlFor={'workflow_new_fields_branch_' + branch_name}>{branch_name}</label>
                  </div>
                );
              })}
            </div>
          </div>
        </td>
      </tr>
    );
  }

  /**
   * Returns the UI for a new algorithm
   */
  generateAlgorithmInfoUI() {
    return (
      <>
        {algo_new_ui_def.map((item) =>
          <tr key={item.name}>
            <TemplateUIElement template={item} id={item.name} id_prefix="workflow_new_replace_algo_" new_id={this.onAlgoNewId} change={this.onAlgoInfoChange} />
          </tr>
        )}
      </>
    );
  }

  /**
   * Generates the UI for selecting algorithms to replace an existing one
   */
  generateAlgorithmSelectionUI() {
    const have_algo_repo_info = this.algoHaveRepoInfo();
    const have_algo_requirements = this.state.replace_algo_checked && this.algoHaveRepoBranch();
    const algo_ok_button_text = this.state.replace_algo_checked ? 'OK' : 'Check';
    const algo_ok_button_cb = have_algo_requirements ? this.onReplaceAlgoOK : (have_algo_repo_info ? this.onAlgoCheckRepo : null);
    let algo_ok_button_classes = 'workflow-new-replace-algo-button workflow-new-replace-algo-ok';

    if (!have_algo_repo_info && !this.state.replace_algo_checked) {
      algo_ok_button_classes += ' workflow-new-replace-algo-ok-disabled';
    } else if (!have_algo_requirements && this.state.replace_algo_checked) {
      algo_ok_button_classes += ' workflow-new-replace-algo-ok-disabled';
    }

    return (
      <div id="workflow_new_replace_algo_background" className="workflow-new-replace-algo-background">
        <div id="workflow_new_replace_algo_wrapper" className="workflow-new-replace-algo-wrapper">
          <div id="workflow_new_replace_algo_frame" className="workflow-new-replace-algo-frame">
            <div id="workflow_new_replace_algo_titlebar" className="workflow-new-replace-algo-titlebar">
              <div id="workflow_new_replace_algo_titlebar_left" className="workflow-new-replace-algo-titlebar-left"></div>
              <div id="workflow_new_replace_algo_titlebar_center" className="workflow-new-replace-algo-titlebar-center">Replace Algorithm ({this.state.cur_algo_type})</div>
              <div id="workflow_new_replace_algo_titlebar_right" className="workflow-new-replace-algo-titlebar-right">
                <div id="workflow_new_replace_algo_titlebar_cancel" className="workflow-new-replace-algo-titlebar-close" onClick={this.onReplaceAlgoCancel} >x</div>
              </div>
            </div>
            <div id="workflow_new_replace_algo_body" className="workflow-new-replace-algo-body">
              <table>
                <tbody>
                  {algo_sel_ui_def.map((item) => {
                    let props = {};
                    let item_save_name = item.name;

                    if (item.type === 'file') {
                      props.browse = this.browseGit;
                      if (item.default === undefined) {
                        item.default = {location: 'rgb_algorithm.py', id: item_save_name, auth: null, data_type: 'git', path_is_file: true, name: 'rgb_algorithm.py'}
                      }
                    }
                    return (
                      <tr key={item.name}>
                        <TemplateUIElement template={item} id={item_save_name} id_prefix="workflow_new_replace_algo_" new_id={this.onAlgoNewId} change={this.onAlgoChange} {...props} />
                      </tr>
                    );
                  }
                  )}
                  {this.state.replace_algo_checked && this.generateAlgorithmInfoUI()}
                  {this.generateAlgorithmBranchUI()}
                </tbody>
              </table>
            </div>
            <div id="workflow_new_replace_algo_footer" className="workflow-new-replace-algo-footer">
              <div id="workflow_new_replace_algo_ok" className={algo_ok_button_classes} onClick={algo_ok_button_cb}>{algo_ok_button_text}</div>
              <div className="workflow-new-replace-algo-footer-spacer"></div>
              <div id="workflow_new_replace_algo_cancel" className="workflow-new-replace-algo-button workflow-new-replace-algo-cancel" onClick={this.onReplaceAlgoCancel}>Cancel</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Returns the pending UI when refeshing the message details for a workflow
   * @param {bool} force - when truthiness is true, will force the display of the UI regardless of whether there's messages, or not.
   */
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

    wait_style.left = client_rect.x;
    wait_style.top = client_rect.y;
    wait_style.width = client_rect.width;
    wait_style.height = client_rect.height;

    return (
      <div id="workflow_details_pending_wrapper" className="workflow-details-pending-wrapper" style={wait_style}>
        <div className="workflow-details-pending-spacer"></div>
        <div id="workflow_details_pending_prompt" className="workflow-details-pending-prompt">Loading...</div>
        <div className="workflow-details-pending-spacer"></div>
      </div>
    );
  }

  /**
   * Returns the UI of the workflow download indicator
   * @param {Object} workflow_item - the workflow item to download the indicator for
   * @param {int} workflow_item.status_code - the code of the workflow status
   */
  generateDownloadUI(workflow_item) {
    // Only download when the job is complete
    if (workflow_item.status_code !== job_status.completed) {
      return null;
    }

    return (
      <>
        <div id="workflow_details_download_wrapper" className="workflow-details-download-wrapper" >
          <div className="workflow-details-download-spacer"></div>
          <div id="workflow_details_graphic_wrapper" className="workflow-details-graphic-wrapper" >
            <svg version="1.1"
                 baseProfile="full"
                 width="30" height="21"
                 xmlns="http://www.w3.org/2000/svg">
              <polygon points="15 21 25 12 20 12 20 3 10 3 10 12 5 12 15 21" stroke="lightgrey" fill="white" strokeWidth="1" />
            </svg>
          </div>
          <div className="workflow-details-download-spacer"></div>
      </div>
      </>
    );
  }

  /**
   * Returns the UI for displaying workflow messages
   */
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

  /**
   * Returns the UI for creating a new workflow
   */
  generateNewWorkflowUI() {
    // If there isn't a workflow type selected, set the focus to that control
    if (this.state.new_workflow_idx == null) {
      let el = document.getElementById('workflow_new_types');
      if (el) {
        el.focus();
      }
      return;
    }

    //  Gather the data for configuring the workflow
    const cur_index = this.state.new_workflow_idx;
    const cur_template = this.state.new_workflows[cur_index];

    return cur_template.steps.map((item, step_index) => {
      const supported_algorithm = item.algorithm === 'RGBA Plot';
      const new_step_wrapper_classes = 'workflow-new-step-wrapper' + (supported_algorithm ? ' workflow-new-step-wrapper-algorithm' : '');

      return (
        <div id={'workflow_new_step_' + item.name + '_wrapper'} key={item.name} className={new_step_wrapper_classes}>
          <div className="workflow-new-step-details-wrapper">
            <div id={'workflow_new_' + item.name + '_name_wrapper'} className="workflow-new-step-item-wrapper workflow-new-step-name-wrapper">
              <div className="workflow-new-step-row-padding"></div>
              <div id={'workflow_new_' + item.name + '_name'} className="workflow-new-step-name">{item.name}</div>
              <div className="workflow-new-step-row-padding"></div>
              {item.git_repo !== undefined && <div id={'workflow_new_name_' + item.name + '_git_indicator'} className="workflow-new-name-git-indicator">git</div>}
              {supported_algorithm && <div id="workflow_new_replace_algorithm_button" className="workflow-new-replace-algorithm-button" onClick={() => {this.onReplaceAlgorithm(item.algorithm, step_index);}}>Replace</div>}
            </div>
            <div id={'workflow_new_' + item.name + '_description_wrapper'} className="workflow-new-step-item-wrapper workflow-new-step-description-wrapper">
              <div id={'workflow_new_' + item.name + '_description'} className="workflow-new-step-description">{item.description}</div>
            </div>
          </div>
          <table className="workflow-new-fields-table">
            <thead>
              <tr>
                <th className="workflow-new-fields-table-header">Input fields</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {item.fields.map((field) => {
                if (field.prev_command_path) {
                  return  null;
                }

                return (
                  <tr key={item.name}>
                    <td id={'workflow_new_' + item.name + '_' + field.name + '_name'} className="workflow-new-field-name">{field.description}</td>
                    <td id={'workflow_new_' + item.name + '_' + field.name + '_type'} className="workflow-new-field-type">{field.type}</td>
                  </tr>
                );}
              )}
            </tbody>
          </table>
        </div>
      );}
    );
  }

  /**
   * Returns the UI for each step of a workflow
   * @param {Object} parent - the step to generate the UI for
   * @param {int|string} idx - the index associated with the current step
   * @param {Object} default_value - the default values associated with the workflow (may have been set by the user)
   */
  generateStepUI(parent, idx, default_values) {
    const field_lookup_prefix = idx + '_' + parent.command + '_';

    return (parent.fields.map((item) => {
        if (item.visibility !== 'ui') {
          return null;
        }

        let item_save_name = field_lookup_prefix + item.name;
        item.item_save_name = item_save_name;

        const found_value = default_values[item_save_name] !== undefined ? default_values[item_save_name] : null;
        if (found_value !== null) {
          item.default = found_value;
        }

        let props = {};
        if (item.type === 'file') {
          props.files = this.files;
          props.browse = this.browseFiles;
          if ((item.default === undefined) && (this.files.length > 0)) {
            item.default = {location: this.files[0].location, id: item_save_name, auth: this.files[0].auth,
                                         data_type: this.files[0].data_type, path_is_file: true, name: this.files[0].location}
          }
        } else if (item.type === 'folder') {
          props.folders = this.folders;
          if ((item.default === undefined) && (this.folders.length > 0)) {
            item.default = {location: this.folders[0].location, id: item_save_name, auth: this.folders[0].auth,
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

  /**
   * Returns the UI for the right side of the title bar
   */
  generateTitleRightUI() {
    return (
      <>
        <div id="workflow_types_upload_wrapper" className="workflow-types-upload-wrapper" onClick={this.browseUploadFiles}
             draggable="true" onDragEnter={this.dragStart} onDrop={this.dragDrop} onDragOver={this.dragOver} onDragLeave={this.dragEnd}>
          <div id="workflow_types_upload_border" className="workflow-types-upload-border-base workflow-types-upload-border" >
            <svg version="1.1"
                 baseProfile="full"
                 width="30" height="21"
                 xmlns="http://www.w3.org/2000/svg">
              <polygon points="15 3 25 15 20 15 20 20 10 20 10 15 5 15 15 3" stroke="lightgrey" fill="white" strokeWidth="1" />
            </svg>
          </div>
          <input type="file" id="workflow_types_file_find" accept="application/json"
                 className="workflow-types-upload-file-pick" onChange={this.fileBrowsed}></input>
        </div>
        <div id="workflow_new_button_wrapper" className="workflow-new-button-wrapper">
          <span id="new_button" className="workflow-new-button" onClick={this.newWorkflow}>New</span>
        </div>
        <div id="workflow_types_list_wrapper" className="workflow-types-list-wrapper">
          <select name="workflow_types" id="workflow_types" onChange={this.updateWorkflowType}>
            <option value="" className="workflow-types-option workflow-type-option-item">--Please select--</option>
            {this.state.workflow_defs.map((item, idx) => {return (
                <option value={item.name + '_' + idx} key={item.name + '_' + idx} className="workflow-types-option workflow-type-option-item">{item.name}</option>
              );}
            )}
          </select>
        </div>
        <div id="workflow_run_button_wrapper" className="workflow-run-button-wrapper">
          <span id="run_button" className="workflow-run-button" onClick={this.setupRunWorkflow}>Run</span>
        </div>
      </>
    );
  }

  /**
   * Returns the workspace UI - based upon the current mode of the UI
   */
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
                const ts_string = item.start_ts ? item.start_ts.replace('T', ' ') : '';
                return (
                  <tr id={'workflow_detail_row_' + item.id} key={item.id} className="workflow-detail-row">
                    <td id={'workflow_detail_name_' + item.id} className="workflow-detail-item workflow-detail-name">{item.name}</td>
                    <td id={'workflow_detail_type_' + item.id} className="workflow-detail-item workflow-detail-type">{item.workflow_type}</td>
                    <td id={'workflow_detail_status_' + item.id} className="workflow-detail-item workflow-detail-status">{item.status}</td>
                    <td id={'workflow_detail_started_' + item.id} className="workflow-detail-item workflow-detail-started">{ts_string}</td>
                    <td id={'workflow_detail_id_' + item.id} className="workflow-detail-item workflow-detail-id">{item.id}</td>
                    <td id={'workflow_detail_messages_' + item.id} className="workflow-detail-item workflow-detail-messages" onClick={(ev) => this.onViewDetails(ev, item.id)}>View</td>
                    <td id={'workflow_detail_del_' + item.id} className="workflow-detail-item workflow-detail-delete" onClick={(ev) => this.onDeleteItem(ev, item.id)}>Delete</td>
                    <td id={'workflow_detail_download_' + item.id} className="workflow-detail-item workflow-detail-download" onClick={(ev) => this.onDownloadItem(ev, item.id)}>
                      {this.generateDownloadUI(item)}
                    </td>
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
              <div id="workflow_details_show_messages" className={messages_class_names} onClick={this.displayWorkflowMessages}>
                <div className="workflow-details-show-text-wrapper">
                  <img src="MessagesIndicator.png" alt="Messages" className="workflow-details-messages-indicator" />
                  <span className="details-count-item details-count-message">{message_count_string}</span>
                </div>
              </div>
              <div id="workflow_details_show_errors" className={error_class_names} onClick={this.displayWorkflowErrors}>
                <div className="workflow-details-show-text-wrapper">
                  <img src="ErrorsIndicator.png" alt="Other messages" className="workflow-details-errors-indicator" />
                  <span className="details-count-item details-count-error">{error_count_string}</span>
                </div>
              </div>
              <div className="workflow-details-show-spacer"></div>
              <div id="workflow_details_status_wrapper" className="workflow-details-status-wrapper">
                <div id="workflow_details_status_prompt" className="workflow-details-status-prompt">Status:</div>
                <div id="workflow_details_status" className="workflow-details-status">---</div>
              </div>
              <div className="workflow-details-show-spacer"></div>
              <div id="workflow_details_refresh" className="workflow-details-refresh" onClick={this.refreshWorkflowMessages}>Refresh</div>
            </div>
            <div id="workflow_details_details_wrapper" className="workflow-details-details-wrapper">
              <div id="workflow_details_details" className="workflow-details-details">{this.generateMessages()}</div>
            </div>
            {this.generateDetailsPendingUI()}
          </div>
        );
      }

      case workflow_modes.new_workflow:
      case workflow_modes.replace_algorithm:
      {
        let save_button_classes = 'workflow-new-footer-save-button';
        let save_button_cb = this.state.algo_new_name ? this.onNewWorkflowSave : null;
        if (!this.state.algo_new_name) {
          save_button_classes += ' workflow-new-footer-save-button-disabled';
        }

        return (
          <div id="workflow_new_wrapper" className="workflow-new-wrapper">
            <div id="workflow_new_types_wrapper" className="workflow-new-types-wrapper">
              <div id="workflow_new_types_prompt" className="workflow-new-types-prompt">Starting configuration</div>
              <select name="workflow_new_types" id="workflow_new_types" onChange={this.updateNewWorkflowType}>
                <option value="" className="workflow-types-option workflow-type-option-item">--Please select--</option>
                {this.state.workflow_defs.map((item, idx) => {return (
                    <option value={item.name + '_new_' + idx} key={item.name + '_' + idx} className="workflow-new-types-option workflow-new-type-option-item">{item.name}</option>
                  );}
                )}
              </select>
            </div>
            {this.state.new_workflow_idx !== null &&
              <div id="workflow_new_name_wrapper" className="workflow-new-name-wrapper">
                <div id="workflow_new_name_prompt" className="workflow-new-name-prompt">Name</div>
                <input type="text" id="workflow_new_name" className="workflow-new-name" onChange={this.onNewWorkflowName}></input>
              </div>
            }
            {this.generateNewWorkflowUI()}
            {this.state.mode === workflow_modes.replace_algorithm && this.generateAlgorithmSelectionUI()}
            {this.state.new_workflow_idx !== null &&
              <div id="workflow_new_footer_wrapper" className="workflow-new-footer-wrapper">
                <div id="workflow_new_footer_save_button" className={save_button_classes} onClick={save_button_cb}>Save</div>
              </div>
            }
          </div>
        );
      }
    }
  }

  /**
   * Returns the title UI of the display columns for showing known workflows
   * @param {Object} title - the title string to display
   * @param {int|string} idx - the index associated with the title_string
   */
  getTitle(title, idx) {
    if (title && (title.length > 0) && (title[0] !== '_')) {
      if (title !== ' ') {
        return (<th id={"title_" + idx} key={title} className="workflow-title-text">{title}</th>);
      } else {
        return (<th id={"title_" + idx} key={title + '_' + idx}></th>);
      }
    }
    return null;
  }

  /**
   * Handles the successful request for starting of a job
   * @param {Object} results - the results of the start request
   * @param {Object} workflow_info - the information on the started workflow
   * @param {Object} workflow_data - the data that was used to start the workflow
   */ 
  handleSuccessJobStart(results, workflow_info, workflow_data) {
    console.log(results, workflow_info, workflow_data);
    workflow_info.job_id = results.id;
    workflow_info.workflow_data = workflow_data;
    workflow_info.start_ts = results.start_ts;

    // Add the job
    this.props.onAdd(workflow_info);

    // Reset the user entered data
    this.workflow_configs[workflow_info.workflow_type] = {};

    this.workflow_status_timer =  window.setTimeout(() => {this.prepareWorkflowStatus(workflow_info.id)}, 500);

    // Update the list of workflows
    this.setState({mode: workflow_modes.main, cur_item_index: null, cur_item_name: null, cur_item_title: null,
                   edit_item: null, workflow_list: this.props.workflows()});
  }

  /**
   * Called when workflow messages have been retreived
   * @param {string} job_id - the ID of the job the messages are associated with
   * @param {Object} messages - the returned set of messages (regular and error)
   */
  handleWorkflowMessages(job_id, messages) {
    // We have messages that can replace what's there
    this.prepared_messages = null;
    this.prepared_errors= null;

    this.setState({job_messages: messages.messages !== undefined ? messages.messages : [],
                   job_errors: messages.errors !== undefined ? messages.errors :  []});
  }

  /**
   * Updates the current UI with the status of a workflow
   * @param {string} job_id - the ID of the job whose status is being updated
   * @param {Object} status - the retreived status of the job 
   * @param {string} update_el_id - the UI ID of the element to show the updated status
   */
  handleWorkflowStatus(job_id, status, update_el_id) {
    let cur_workflow = this.state.workflow_list.find(item => item.job_id === job_id);

    if (!cur_workflow) {
      return undefined;
    }

    if (status.result === undefined) {
      console.log('Workflow Status: unknown workflow status found', status);
      return undefined;
    }

    const prev_status_code = cur_workflow.status_code;

    let cur_status = '';
    switch (status.result){
      case job_status.started: cur_status = 'Starting'; break;
      case job_status.running: 
        if (status.status !== undefined && status.status.running !== undefined && status.status.running.message !== undefined) {
          cur_status = status.status.running.message;
        } else {
          cur_status = 'Running'; 
        }
        break;
      case job_status.completed: cur_status = 'Finished'; break;
      default: cur_status = 'unknown'; break;
    }

    cur_workflow.status = cur_status;
    cur_workflow.status_code = status.result;

    // Update the UI
    let el = document.getElementById(update_el_id);
    if (el) {
      el.innerHTML = cur_status;
    }

    if (status.result === job_status.completed && prev_status_code === job_status.completed) {
      // Refresh the whole UI
      this.setState({workflow_list: this.state.workflow_list});
    }

    return status.result;
  }

  /**
   * Queries the UI to determine if all the required parameters have been filled in for running a workflow
   * @returns {bool} true is returned if all required parameters have values, and false if not
   */
  haveRequiredWorkflowParameters() {
    const invalid_values = [null, undefined, ''];
    if (!this.mandatory_ids) {
      return false;
    }

    return (this.mandatory_ids.length > 0) && this.mandatory_ids.every((el_id) => {
      const el = document.getElementById(el_id);
      return el && !invalid_values.includes(el.value)
    });
  }

  /**
   * Called when a new UI ID for data entry is generated
   * @param {Object} item - the workflow step field that the ID was generated for
   * @param {string} new_id - the ID that was generated for the field
   */
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

  /**
   * Called when thee user wants to create a new workflow
   */
  newWorkflow() {
    this.setState({mode: workflow_modes.new_workflow, new_workflow_idx:null, algo_new_name: null});
  }

  /**
   * Called when Algorithm replacement fields are changed
   */
  onAlgoChange(ev) {
    // TODO: If we have an algorithm ID we need to delete it from the server
    this.setState({replace_algo_checked: false, algo_repo_branches: []});
  }

  /**
   * Handles checking that we can access the repository for an algorithm
   */
  onAlgoCheckRepo() {
    const form_data = new FormData();
    algo_sel_ui_def.forEach((item) => {
      const el = document.getElementById(this.algo_repo_conn_id_map[item.name]);
      form_data.append(item.name, el.value);
    });

    const uri = Utils.getHostOrigin().concat('/algorithm/gitcheck');
    try {
      fetch(uri, {
        method: 'POST',
        credentials: 'include',
        body: form_data
        }
      )
      .then(response => {if (response.status >= 200 && response.status < 300) return response.json(); else throw response.statusText;})
      .then(result => {this.setState({algo_repo_branches: result.branches.concat(result.tags).sort(), replace_algo_checked: true, algo_repo_id: result.id});})
      .catch(error => console.log("ERROR", error));
    } catch (err) {
      console.log("Run workflow exception", err);
      throw err;
    }
  }

  /**
   * Called when information on the algorithm is changed
   */
  onAlgoInfoChange() {
    const have_req_fields = algo_new_ui_def.every((item) => {
        const el_id = this.algo_repo_conn_id_map[item.name];
        if ((el_id === null) || (el_id === undefined)) {
          return false;
        }
        const el = document.getElementById(el_id);
        return el && el.value.trim().length > 0;        
      });

    // Setting this to get a display refresh
    if (have_req_fields) {
      this.setState({replace_algo_checked: this.state.replace_algo_checked});
    }
  }

  /**
   * Called when a new ID is generated for the algorithm replacement UI
   */
  onAlgoNewId(item, new_id) {
    this.algo_repo_conn_id_map[item.name] = new_id;
  }

  /**
   * Called when the user clicks the "back" button
   * @param {Object} ev - the triggering event
   */
  onBack(ev) {
    if (this.state.mode === workflow_modes.main) {
      this.props.onDone(ev);
    } else {
      this.setState({mode: workflow_modes.main, browse_files: null, details_job_id: null});
    }
  }

  /**
   * Called when the user cancels the browsing of remote storage
   */
  onCancelBrowse() {
    this.setState({browse_files: null, browse_cb: null});
  }

  /**
   * Called when the user wants to delete a listed workflow. Also deletes the serveer-side information on the workflow
   * @param {Object} ev - the triggering event
   * @param {string} workflow_id -the workflow ID associated with the delete event
   */
  onDeleteItem(ev, workflow_id) {
    const found_item = this.state.workflow_list.find((item) => item.id === workflow_id);

    if (found_item === undefined || found_item === null) {
      return;
    }

    const uri = Utils.getHostOrigin().concat('/workflow/delete/' + found_item.job_id);

    try {
      fetch(uri, {
        method: 'PUT',
        credentials: 'include',
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText})
      .then(success => {this.props.onDelete(workflow_id); this.setState({'workflow_list': this.props.workflows()});})
      .catch(error => {console.log("ERROR",error);});
    } catch (err) {
      console.log("Fetch workflow details exception", err);
      throw err;
    }
  }

  /**
   * Handles the request to download a workflow configuration
   * @param {Object} ev - the triggering event
   * @param {string} workflow_id -the workflow ID associated with the download event
   */
  onDownloadItem(ev, workflow_id) {
    const found_item = this.state.workflow_list.find((item) => item.id === workflow_id);
    if (!found_item) {
      // TODO: Report problem
      return;
    }
    if (!found_item.workflow_data === null) {
      console.log("MISSING WORKFLOW DATA");
      // TODO: Display error
      return;
    }
    if (found_item.status_code !== job_status.completed) {
      console.log("Unable to download workflow until it has completed");
      // TODO: display error
      return;
    }

    const workflow_def = this.state.workflow_defs.find((item) => item.id === found_item.workflow_type);
    console.log("FOUND:", found_item, workflow_def);
    if (!workflow_def) {
      // TODO: Report problem
      return;
    }

    const save_filename = found_item.name.replaceAll(' ','_').concat('.json');
    const form_data = new FormData();
    form_data.append('workflow', JSON.stringify(this.prepareWorkflowForExport(workflow_def)));
    form_data.append('data', JSON.stringify(found_item.workflow_data));
    form_data.append('filename', save_filename);

    const uri = Utils.getHostOrigin().concat('/workflow/download');
    try {
      fetch(uri, {
        method: 'POST',
        credentials: 'include',
        body: form_data
        }
      )
      .then(response => response.blob())
      .then(blob => {
        // Create a download object
        const url = window.URL.createObjectURL(
          new Blob([blob]),
        );
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          save_filename,
        );
        // Append to html link element page
        document.body.appendChild(link);
        // Start download
        link.click();
        // Clean up and remove the link
        link.parentNode.removeChild(link);
      })
      .catch(error => console.log("ERROR",error));
    } catch (err) {
      console.log("Run workflow exception", err);
      throw err;
    }

    const found_step = workflow_def.steps.find((item) => item.command === 'merge_csv');
    if (found_step && found_step.results) {
      let found_return = found_step.results.find((item) => item.type === 'file');
      if (found_return) {
        const save_filename = found_return.filename !== undefined ? found_return.filename : found_return.name.replaceAll(' ', '_');
        const form_data = new FormData();
        form_data.append('workflow', JSON.stringify(this.prepareWorkflowForExport(workflow_def)));
        form_data.append('workflow_id', found_item.job_id);
        form_data.append('workflow_path', found_step.command + '|' + found_return.name);
        form_data.append('filename', save_filename);

        const uri = Utils.getHostOrigin().concat('/workflow/artifact');
        try {
          fetch(uri, {
            method: 'POST',
            credentials: 'include',
            body: form_data
            }
          )
          .then(response => response.blob())
          .then(blob => {
            // Create a download object
            const url = window.URL.createObjectURL(
              new Blob([blob]),
            );
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute(
              'download',
              save_filename,
            );
            // Append to html link element page
            document.body.appendChild(link);
            // Start download
            link.click();
            // Clean up and remove the link
            link.parentNode.removeChild(link);
          })
          .catch(error => console.log("ERROR",error));
        } catch (err) {
          console.log("Run workflow exception", err);
          throw err;
        }
      }
    }
  }

  /**
   * Handles changed UI items when configuring a workflow
   * @param {Object} ev - the triggering event
   * @param {string|Object} item_save_name - identifying value passed to the UI element generator (TemplateUIElement)
   * @param {*} mapped_value - optional value(s) dependent upon the UI element type generated
   */
  onItemCheck(ev, item_save_name, mapped_value) {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];

    if (typeof cur_config[item_save_name] === 'object') {
      // Make sure we know what we're working with
      if (cur_config[item_save_name].location !== undefined) {
        cur_config[item_save_name].location = ev.target.value;
      } else {
        alert("Unknown object has been updated. Contact the developer to resolve");
      }
    } else {
      cur_config[item_save_name] =  ev.target.value;
    }
  }

  /**
   * Handles the user changing the workflow name element
   * @param {Object} ev - the triggering event
   */
  onNameChange(ev) {
    let cur_id = this.state.workflow_defs[this.run_workflow_idx].id;
    this.workflow_configs[cur_id].cur_item_name = ev.target.value;

    const cur_name = ev.target.value;
    if (cur_name !== this.state.cur_item_name) {
      this.setState({cur_item_name: cur_name});
    }
  }

  /**
   * Called when the user changes the name of a new workflow
   * @param {Object} ev - the triggering event
   */
  onNewWorkflowName(ev) {
    const cur_name = ev.target.value;
    if (cur_name !== this.state.algo_new_name) {
      this.setState({algo_new_name: cur_name});
    }
  }

  /**
   * Called to save a new workflow
   */
  onNewWorkflowSave() {
    // Check for a duplicate name
    const found_match = this.state.workflow_defs.find((item) => item.name === this.state.algo_new_name);
    if (found_match !== undefined) {
      this.setState({errors: 'Duplicate algorithm name. Please correct and try again'});
      const el = document.getElementById('workflow_new_name');
      if (el) {
        el.focus();
      }
      return;
    }

    const cur_index = this.state.new_workflow_idx;
    const cur_template = this.state.new_workflows[cur_index];

    cur_template.id = Utils.getUuid();
    cur_template.name = this.state.algo_new_name;

    let workflow_defs = this.state.workflow_defs;
    workflow_defs.push(cur_template);

    this.workflow_configs[cur_template.id] = {};

    window.setTimeout(() => {
      let form_data = new FormData();
      form_data.append('workflow', JSON.stringify(cur_template));

      const uri = Utils.getHostOrigin().concat('/workflow/new');
      try {
        fetch(uri, {
          method: 'POST',
          credentials: 'include',
          body: form_data,
          }
        )
        .then(response => {console.log("onNewWorkflowSave:",response);if (response.status >= 300) throw response.statusText;})
        .then(result => {console.log(result);this.setState({mode: workflow_modes.main, workflow_defs});/* TODO: display success message*/})
        .catch(error => console.log('ERROR: onNewWorkflowSave:', error));
      } catch (err) {
        console.log("Run workflow exception", err);
        throw err;
      }
    }, 100);
  }

  /**
   * Called when the user wants to replace an algorithm
   * @param {string} type - the algorithm type to replace
   * @param {int} step_index - the index of the step that's being updated
   */
  onReplaceAlgorithm(type, step_index) {
    const cur_algo_repo_id = this.state.algo_repo_id;
    this.algo_repo_conn_id_map = {};
    this.setState({mode: workflow_modes.replace_algorithm, cur_algo_type: type, algo_step_idx: step_index, algo_repo_branches: [], replace_algo_checked: false, algo_repo_id: null});

    if (cur_algo_repo_id) {
      window.setTimeout(() => {
        const uri = Utils.getHostOrigin().concat('/algorithm/gitclear/' + encodeURI(cur_algo_repo_id));
        try {
          fetch(uri, {
            method: 'PUT',
            credentials: 'include'
            }
          )
          .then(response => {if (response.status >= 300) throw response.statusText;})
          .catch(error => console.log('ERROR: onAlgoChange:', error));
        } catch (err) {
          console.log("Run workflow exception", err);
          throw err;
        }
      }, 100);
    }
  }

  /**
   * Handles the user cancelling algorithm replacement
   */
  onReplaceAlgoCancel() {
    this.setState({mode: workflow_modes.new_workflow, cur_algo_type: null});
  }

  /**
   * Handles the user accepting the algorithm replacement
   */
  onReplaceAlgoOK() {
    let new_workflow = this.state.new_workflows[this.state.new_workflow_idx];
    let cur_step = new_workflow.steps[this.state.algo_step_idx];

    // Update the step with the git information
    algo_sel_ui_def.forEach((item) => {
      const id = this.algo_repo_conn_id_map[item.name];
      const el = document.getElementById(id);

      switch (item.name) {
        case 'repo_url':
          cur_step.git_repo = el.value.trim();
          break;

        default:
          break;
      }
    });
    algo_new_ui_def.forEach((item) => {
      const id = this.algo_repo_conn_id_map[item.name];
      const el = document.getElementById(id);

      switch (item.name) {
        case 'algo_name':
          cur_step.name = el.value.trim();
          break;

        case 'algo_description':
          cur_step.description = el.value.trim();
          break;

        default:
          break;
      }
    });

    let branch_el = document.querySelector('input[name=algo_repo_branch]:checked');
    cur_step.git_branch = branch_el.value;

    this.setState({mode: workflow_modes.new_workflow});
  }

  /**
   * Handles the user's request to see the details of a workflow
   * @param {Object} ev - the triggering event
   * @param {string} workflow_id - the ID of the workflow to see the details for
   */
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

  /**
   * Handles waiting for the UI to be updated so the workflow status can be displayed. The attempt is abandoned if the retry
   * count exceeds the maximum
   * @param {string} workflow_id - the ID of the workflow to show the status of
   * @param {int} retry_count - counter of the number of retry attempts made to get access to the UI
   */
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
    this.workflowStatus(found_workflow.job_id, 'workflow_detail_status_'  + workflow_id);
  }

  /**
   * Prepares a copy of the the current workflow information for exporting (downloading)
   * @param {object} workflow - the workflow object to use for preparation
   */
  prepareWorkflowForExport(workflow) {
    let clean_workflow = {};

    for (let one_item in workflow) {
      if (one_item === 'id') {
        // Skip certain fields
      } else if (one_item !== 'steps') {
        clean_workflow[one_item] = workflow[one_item];
      } else {
        clean_workflow.steps = []
        for (let one_step of workflow.steps) {
          let cur_step = {};
          for (let one_step_item in one_step) {
            if (one_step_item !== 'fields') {
              cur_step[one_step_item] = one_step[one_step_item];
            } else {
              cur_step.fields = []
              for (let one_field of one_step.fields) {
                let cur_field = {};
                for (let one_field_item in one_field) {
                  switch (one_field_item) {
                    case 'default':
                    case 'item_save_name':
                    case '_ui_id':
                      break;

                    default:
                      cur_field[one_field_item] = one_field[one_field_item];
                      break;
                  }
                }

                cur_step.fields.push(cur_field);
              }
            }
          }

          clean_workflow.steps.push(cur_step);
        }
      }
    }

    return clean_workflow;
  }

  /**
   * Handles the user requesting a refesh of the workflow messages
   * @param {object} ev - the triggering event
   */
  refreshWorkflowMessages(ev) {
    // Only fetch messages if we aren't fetching them already (prevent mad clicking from causing problems)
    if (this.workflow_details_timer === null) {
      this.workflow_details_timer = window.setTimeout(() => {
                    this.workflow_details_timer = null;
                    this.fetchWorkflowDetails(this.state.details_job_id);
                  }, 10);
    }
  }

  /**
   * Prepares and makes the request to run a configured workflow on the server. The state is used to determine
   * what workflow to run
   */
  runWorkflow() {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];

    let values = this.generated_ids.map((el_id) => {
      let el = document.getElementById(el_id);
      if (el !== null) {
        let param_info = {id: el_id, value: el.value};
        if (el_id.startsWith(id_prefix)) {
          param_info.name = el_id.substring(id_prefix.length);
        } else {
          param_info.name = el_id.split('_').pop();
        }

        // Try to find the  element in our stored configuration values
        if (!el_id.startsWith(id_prefix)) {
          // We assume we have a workflow configuration item
          const key_parts = el_id.split('_');
          param_info.step_idx = parseInt(key_parts.shift());
          key_parts.pop();
          param_info.step_name = key_parts.join('_');

          const found_key = Object.keys(cur_config).find((id) => cur_config[id].id === el_id);
          if (found_key !== undefined) {
            param_info.config = cur_config[found_key];
          } else {
            let found_item = null
            for (let i = 0; i < cur_template.steps.length; i++) {
              found_item = cur_template.steps[i].fields.find((item) => item._ui_id !== undefined && item._ui_id === el_id);
              if (found_item) {
                break;
              }
            }
            if (found_item && found_item.default !== undefined && 
                            ((found_item.type === 'file') || (found_item.type === 'folder'))) {
              param_info.config = found_item.default;
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
      let param_info = {};
      if (param.step_idx !== undefined) {
        param_info.command = cur_template.steps[param.step_idx].command;
        param_info.field_name = param.name;
      }
      if (param.config !== undefined) {
        param_info.auth = param.config.auth;
        param_info.data_type = param.config.data_type;
        param_info.value = param.config.location;
      } else {
        param_info[param.name] = param.value;
      }
      workflow_data.params.push(param_info);
    }

    const name_item = workflow_data.params.find(item => item.workflow_name !== undefined);
    let workflow_info = {id: Utils.getUuid(), name: name_item ? name_item.workflow_name : '',
                         workflow_type: workflow_data.id, job_id: null}

    const uri = Utils.getHostOrigin().concat('/workflow/start');
    try {
      fetch(uri, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(workflow_data)
        }
      )
      .then(response => {if (response.ok) return response.json(); else throw response.statusText})
      .then(success => {this.handleSuccessJobStart(success, workflow_info, workflow_data);})
      .catch(error => console.log("ERROR",error));
    } catch (err) {
      console.log("Run workflow exception", err);
      throw err;
    }
  }

  /**
   * Run a workflow
   */
  setupRunWorkflow() {
    // If there isn't a workflow type selected, set the focus to that control
    if (this.run_workflow_idx == null) {
      let el = document.getElementById('workflow_types');
      el.focus();
      return;
    }

    //  Gather the data for configuring the workflow
    const cur_index = this.run_workflow_idx;
    const cur_template = this.state.workflow_defs[cur_index];
    let cur_name = cur_template.name;
    const title_name = cur_name;
    const cur_item_name = this.workflow_configs[cur_template.id].cur_item_name;
    if (cur_item_name !== null && cur_item_name !== undefined) {
      cur_name = cur_item_name;
    }

    // Reset some class variables
    this.generated_ids = [];
    this.mandatory_ids = [];
    this.prepared_messages = null;
    this.prepared_errors = null;

    // Set the state to show the workflow configuration UI
    this.setState({mode: workflow_modes.run,
                   cur_item_index: cur_index,
                   cur_item_name: cur_name, 
                   cur_item_title: 'New ' +  title_name,
                   edit_add: true,
                   edit_item: null,
                   met_requirements: this.haveRequiredWorkflowParameters(),
                   errors: null,
                   cur_messages: null});
  }

  /**
   * Enables the displaying of download options
   * @param {Object} ev - the triggering event
   * @param {string} workflow_id -the workflow ID associated with the download event
   */
  showDownloadOptions(ev, workflow_id) {
    this.setState({downloading_id: workflow_id});
  }

  /**
   * Updates the state when a new workflow type is selected to configure
   * @param {Object} ev - the triggering event
   */
  updateNewWorkflowType(ev) {
    const target_val = ev.target.value;

    if (!target_val || (target_val.length <= 0)) {
      if (this.state.new_workflow_idx !== null) {
        this.setState({new_workflow_idx: null});
      }
      return;
    }

    let new_workflow_idx = null;
    if (target_val !== 'new') {
      let found_idx = this.state.workflow_defs.findIndex((item, idx) => item.name + '_new_' + idx === target_val);
      new_workflow_idx = found_idx >= 0 ? found_idx : null;
    } else {
      new_workflow_idx = -1;
    }

    const updated_state = {}
    if (new_workflow_idx !== this.state.new_workflow_idx) {
      updated_state.new_workflow_idx = new_workflow_idx;
    }

    if (!this.state.new_workflows || (this.state.new_workflows.length <= 0)) {
      updated_state.new_workflows = this.state.workflow_defs.map((item) => Object.assign({}, item));
    }

    this.setState(updated_state);
  }

  /**
   * Updates the state when a workflow type is selected to run
   * @param {Object} ev - the triggering event
   */
  updateWorkflowType(ev) {
    const target_val = ev.target.value;

    if (!target_val || (target_val.length <= 0)) {
      this.run_workflow_idx = null;
      return;
    }

    let found_idx = this.state.workflow_defs.findIndex((item, idx) => item.name + '_' + idx === target_val);
    this.run_workflow_idx = found_idx >= 0 ? found_idx : null;
  }

  /**
   * Called when a workflow configuration has finished uploading
   * @param {object} results - the results of the upload to the server (contains workflow and data fields)
   */
  uploadCompleted(results) {
    if (results.messages) {
      // TODO: show messages
    }

    // If we have a workflow, present it for running
    if (results.workflows && results.workflows.length > 0) {
      const cur_workflow = results.workflows.shift();
      console.log("CUR WORKFLOW",cur_workflow);

      // Setup our data fields
      const cur_config = [];
      for (let idx in cur_workflow.steps) {
        const parent = cur_workflow.steps[idx];
        const field_lookup_prefix = idx + '_' + parent.command + '_';

        let found_fields = cur_workflow.parameters.map((item) => {
                  if (item.command === parent.command) {
                    return item;
                  }
                  return null;
                }
              );

        found_fields.forEach((one_field) => {
          if (one_field && (!one_field.visibility || one_field.visibility === 'ui')) {
            const lookup_name = field_lookup_prefix + one_field.field_name
            const parent_field = parent.fields.find((item) => item.name === one_field.field_name);
            one_field.id = lookup_name;
            if (parent_field.type === 'file' || parent_field.type === 'folder') {
              one_field.path_is_file = parent_field.type === 'file';
              one_field.location = one_field.value;
            }
            cur_config[lookup_name] = one_field;
          }
        });
      }
      this.workflow_configs[cur_workflow.id] = cur_config;

      // Update other data variables
      let updated_workflow_defs = this.state.workflow_defs;
      updated_workflow_defs.push(cur_workflow);
      const cur_index = updated_workflow_defs.findIndex((item) => item.id === cur_workflow.id);

      // Reset some class variables
      this.generated_ids = [];
      this.mandatory_ids = [];
      this.prepared_messages = null;
      this.prepared_errors = null;

      // Set the state to show the workflow configuration UI
      this.setState({mode: workflow_modes.run,
                     workflow_defs: updated_workflow_defs,
                     cur_item_index: cur_index,
                     cur_item_name: cur_workflow.name, 
                     cur_item_title: 'Run ' +  cur_workflow.name,
                     edit_add: true,
                     edit_item: null,
                     met_requirements: this.haveRequiredWorkflowParameters(),
                     errors: null,
                     cur_messages: null});
    }
  }

  /**
   * Handles the user's request to upload workflow files
   * @param {Object[]} files - the File objects to upload to  the server
   */
  uploadHandle(files) {
    let upload_count = 0;
    let form_data = new FormData();
    for (let i = 0; i < files.length; i++) {
      let one_file = files[i];
      if (one_file.size > MAX_FILE_SIZE) {
        //TODO: this.displayError('One or more files exceed the maximum allowed size of ' + (MAX_FILE_SIZE / 1024) + 'Kb');
        console.log("File too large: '" + one_file.name + "'' " + one_file.size);
        return;
    }
      form_data.append('file' + i, one_file, one_file.name);
      upload_count++;
    }

    if (upload_count <= 0) {
      return;
    }

    form_data.append('version', WORKFLOW_CURRENT_VERSION);

    fetch(Utils.getHostOrigin() + '/workflow/upload', {
      method: 'POST',
      credentials: 'include',
      body: form_data,
      }
    )
    .then(response => {if (response.ok) return response.json(); else throw response.statusText})
    .then(success => {this.uploadCompleted(success);})
    .catch(error => {
                     console.log('ERROR', error);
                     //this.displayError('Unable to complete upload request: ' + error);
                    }
    );
  }

 /**
  * Used to retrieve the workflow status for the workflow details display
  * @param {string} job_id - the ID of the job to fetch the status for
  */
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

 /**
  * Used to retrieve the workflow status for the workflow listing display
  * @param {string} job_id - the ID of the job to fetch the status for
  * @param {string} el_id - the UI ID of the element to update after the status is fetched
  */
  workflowStatus(job_id, el_id) {
    this.fetchWorkflowStatus(job_id,
              (job_id, status) => {
                const cur_status = this.handleWorkflowStatus(job_id, status, el_id);
                if (cur_status !== job_status.completed) {
                  // Set timer for a status update
                  this.workflow_status_timer = window.setTimeout(() => {
                    this.workflow_status_timer = null;
                    this.workflowStatus(job_id, el_id);
                  }, 5000);
                }
              });
  }

  /**
   * Render the UI
   */
  render() {
    const viewing_details = (this.state.mode === workflow_modes.details) || (this.state.mode === workflow_modes.details_finished);
    const title_right_generator = !viewing_details && (this.state.mode !==  workflow_modes.new_workflow) ? this.generateTitleRightUI : null;
    const have_errors = this.state.errors !== null;

    return (
      <>
        {have_errors && <Message msg={this.state.errors} type={Message.type.warning} ok={this.dismissMessage} cancel={this.dismissMessage} />}
        <div id="workflow_wrapper" className="workflow-wrapper">
          <WorkspaceTitlebar title="Manage image-based workflows" back={this.onBack} extra={title_right_generator}/>
          {this.generateWorkflowUI()}
        </div>
        {this.state.browse_files === true && <BrowseFolders folders={this.folders} selected={this.state.browse_cb} cancel={this.onCancelBrowse}/>}
      </>
    );
  }
}

export default AWorkflow;
