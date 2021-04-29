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
  'Steps',
  'ID',
  ' ',
  ' ',
];

var workflow_modes = {
  main: 0,
  new: 1,
};

var name_ui_def =  {
  name: 'workflow_name',
  prompt: 'Name',
  description: 'Name of workflow',
  default: '',
  type: 'plain',
  minlength: '1',
  maxlength: '100',
}

var id_prefix = 'workflow_new_item_';

class AWorkflows extends Component {
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.browseFiles = this.browseFiles.bind(this);
    this.finishAdd = this.finishAdd.bind(this);
    this.generateTitleRightUI = this.generateTitleRightUI.bind(this);
    this.generateStepUI = this.generateStepUI.bind(this);
    this.generateWorkflowUI = this.generateWorkflowUI.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.haveRequiredWorkflowParameters = this.haveRequiredWorkflowParameters.bind(this);
    this.newIdAdded = this.newIdAdded.bind(this);
    this.onBack = this.onBack.bind(this);
    this.onCancelBrowse = this.onCancelBrowse.bind(this);
    this.onCancelEdit = this.onCancelEdit.bind(this);
    this.onItemCheck= this.onItemCheck.bind(this);
    this.onNameChange= this.onNameChange.bind(this);
    this.runWorkflow = this.runWorkflow.bind(this);
    this.updateNewType = this.updateNewType.bind(this);

    const workflow_defs = [...workflowDefinitions];

    const all_files = this.props.files();
    this.files = all_files.filter((item) => item.path_is_file === true);
    this.folders = all_files.filter((item) => item.path_is_file !== true);

    for (let ii = 0; ii < workflow_defs.length; ii++) {
      this.workflow_configs[workflow_defs[ii].id] = {};
    }

    this.state = {
      mode: workflow_modes.main,    // The current display mode
      browse_files: null,           // Flag used to browse files, folders, or no-browse(=null)
      cur_item_index: null,         // The index of the new item to edit
      cur_item_name: null,          // The name of the new item
      cur_item_title: null,         // The title to display for the new item window
      edit_add: true,               // Flag used to determine if we're adding or editing an item
      edit_item: null,              // The item we're editing when we edit
      workflow_list: [],            // The list of defined workflows
      workflow_defs,                // The workflow definitions
      browse_cb: null,              // The callback to handle the users file choices
      met_requirements: false,      // Flag indicating requirements have been met
    };
  }

  generated_ids = [];           // IDs of all elements we generated
  mandatory_ids = [];           // IDs of mandatory elements we generated
  new_workflow_idx = null;      // The index of a new workflow to specify
  workflow_configs = {};        // The configurations for workflows

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

    this.setState({mode: workflow_modes.new, cur_item_index: cur_index, cur_item_name: cur_name, 
                   cur_item_title: 'New ' +  title_name, edit_cb: this.finishAdd, edit_add: true, edit_item: null});
  }

  browseFiles(ev, element_id, item) {
    this.setState({browse_files: true, browse_cb: (path, folder_type) => {this.finishBrowse(path, element_id, item, folder_type)}});
  }

  finishAdd() {

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

  generateStepUI(parent, idx, default_values) {
    const field_lookup_prefix = idx + '_' + parent.command + '_';

    return (parent.fields.map((item) => {
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
        } else if (item.type === 'folder') {
          props['folders'] = this.folders;
        }

        return(
          <tr id={item.name + '_' + idx} key={item.name + '_' + idx}>
            <TemplateUIElement template={item} id={item_save_name} id_prefix={id_prefix} new_id={this.newIdAdded}
                               change={(ev) => {this.onItemCheck(ev, item_save_name);}} {...props}/>
          </tr>
        );
      })
    );
  }

  generateWorkflowUI() {
    switch (this.state.mode) {
      default:
      case workflow_modes.main:
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
                    <td id={'workflow_detail_type_' + item.id} className="workflow-detail-item workflow-detail-type">{item.data_type}</td>
                    <td id={'workflow_detail_loc_' + item.id} className="workflow-detail-item workflow-detail-steps">{item.steps}</td>
                    <td id={'workflow_detail_id_' + item.id} className="workflow-detail-item workflow-detail-id">{item.id}</td>
                    <td id={'workflow_detail_edit_' + item.id} className="workflow-detail-item workflow-detail-edit" onClick={(ev) => this.editItem(ev, item.id)}>Edit</td>
                    <td id={'workflow_detail_del_' + item.id} className="workflow-detail-item workflow-detail-delete" onClick={(ev) => this.deleteItem(ev, item.id)}>Delete</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        );

      case workflow_modes.new:
        const cur_template = this.state.workflow_defs[this.state.cur_item_index];
        const cur_values = this.workflow_configs[cur_template.id];
        const workflow_run_classes = "workflow-new-footer-run " + (this.state.met_requirements ? "" : "workflow-new-footer-disabled ");
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
              <div id="workflow_new_footer_run" className={workflow_run_classes} onClick={this.runWorkflow}>Run</div>
            </div>
          </div>
        );
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

  haveRequiredWorkflowParameters() {
    const invalid_values = [null, undefined, ''];

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
      this.props.done(ev);
    } else {
      this.setState({mode: workflow_modes.main, browse_files: null});
    }
  }

  onCancelBrowse() {
    this.setState({browse_files: null, browse_cb: null});
  }

  onCancelEdit() {
    this.setState({mode: workflow_modes.main, cur_item_index: null, cur_item_name: null, cur_item_title: null});
  }

  onItemCheck(ev, item_save_name) {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];
    let cur_config = this.workflow_configs[cur_template.id];

    cur_config[item_save_name] =  ev.target.value;
  }

  onNameChange(ev) {
    let cur_id = this.state.workflow_defs[this.new_workflow_idx].id;
    this.workflow_configs[cur_id]['cur_item_name'] = ev.target.value;

    this.setState({cur_item_name: ev.target.value});
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

          let found_key = Object.keys(cur_config).find((id) => cur_config[id].id === el_id);
          if (found_key !== undefined) {
            param_info['config'] = cur_config[found_key];
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

    console.log("Workflow data:", workflow_data);

    const uri = Utils.getHostOrigin().concat('/workflow/start');
    try {
      fetch(uri, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(workflow_data)
        }
      )
      .then(response => response.json())
      .then(success => console.log(success))
      .catch(error => console.log("ERROR",error));
    } catch (err) {
      console.log("iRODS connect exception", err);
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

  render() {
    return (
      <>
        <div id="workflow_wrapper" className="workflow-wrapper">
          <WorkspaceTitlebar title="Manage image-based workflows" back={this.onBack} extra={this.generateTitleRightUI}/>
          {this.generateWorkflowUI()}
        </div>
        {this.state.browse_files === true && <BrowseFolders folders={this.folders} selected={this.state.browse_cb} cancel={this.onCancelBrowse}/>}
      </>
    );
  }
}

export default AWorkflows;
