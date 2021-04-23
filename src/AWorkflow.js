// Workflow interface
import {Component} from 'react';
import WorkspaceTitlebar from './WorkspaceTitlebar';
import TemplateUIElement from './TemplateUIElement';
import BrowseFolders  from './BrowseFolders';
import workflowDefinitions from './WorkflowDefinitions';
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
  name: 'name',
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
    this.newIdAdded = this.newIdAdded.bind(this);
    this.onBack = this.onBack.bind(this);
    this.onCancelBrowse = this.onCancelBrowse.bind(this);
    this.onCancelEdit = this.onCancelEdit.bind(this);
    this.onItemCheck= this.onItemCheck.bind(this);
    this.onNameChange= this.onNameChange.bind(this);
    this.updateNewType = this.updateNewType.bind(this);

    const workflow_defs = workflowDefinitions;

    const all_files = this.props.files();
    this.files = all_files.filter((item) => item.path_is_file === true);
    this.folders = all_files.filter((item) => item.path_is_file !== true);

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
    };
  }

  generated_ids = [];           // IDs of all elements we generated
  mandatory_ids = [];           // IDs of mandatory elements we generated
  new_workflow_idx = null;      // The ID of a new workflow to specify

  addItem() {
    if (this.new_workflow_idx == null) {
      let el = document.getElementById('workflow_types');
      el.focus();
      return;
    }
    const cur_index = this.new_workflow_idx;
    let cur_name = this.state.workflow_defs[cur_index].name;

    this.setState({mode: workflow_modes.new, cur_item_index: cur_index, cur_item_name: cur_name, 
                   cur_item_title: 'New ' +  cur_name, edit_cb: this.finishAdd, edit_add: true, edit_item: null});
  }

  browseFiles(ev, element_id, item) {
    console.log("FILES",ev,element_id,item);
    this.setState({browse_files: true, browse_cb: (path) => {this.finishBrowse(path, element_id, item)}});
  }

  finishAdd() {

  }

  finishBrowse(file_path, el_id, item) {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];

    console.log("FINISH BROWSE:", file_path, el_id, item);
    console.log("   ", this.generated_ids, this.state, this.props);
    this.setState({browse_files: null, browse_cb: null});
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

  generateStepUI(item, idx) {
    return (item.fields.map((item) => {
        let props = {};
        if (item.type === 'file') {
          props['files'] = this.files;
          props['browse'] = this.browseFiles;
        } else if (item.type === 'folder') {
          props['folders'] = this.folders;
        }
        return(
          <tr id={item.name + '_' + idx} key={item.name + '_' + idx}>
            <TemplateUIElement template={item} id_prefix={id_prefix} new_id={this.newIdAdded} change={this.onItemCheck} {...props}/>
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
        let cur_name_ui = name_ui_def;
        cur_name_ui.default = this.state.cur_item_name;

        this.mandatory_check_ids = [];
        this.authentication_ids = [];
        console.log("NEW",cur_template);

        return (
          <div id="workflow_new_wrapper" className="workflow-new_wrapper">
            <div id="workflow_new_title" className="workflow-new-title">{this.state.cur_item_title}</div>
            <table id="workflow_new_items_table" className="workflow-new-items-table">
              <tbody>
                <tr>
                  <TemplateUIElement template={cur_name_ui} id_prefix={id_prefix} new_id={this.newIdAdded} change={this.onNameChange} />
                </tr>
                {cur_template.steps.map(this.generateStepUI)}
              </tbody>
            </table>
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

  newIdAdded(item, new_id) {
    const found = this.generated_ids.find((cur_id) => cur_id === new_id);
    if (found !== undefined) {
      return;
    }

    this.generated_ids.push(new_id);
    if (item.mandatory !== false) {
      this.mandatory_ids.push(new_id);
    }
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

  onItemCheck(ev) {
    // TODO: Save updated info
  }

  onNameChange(ev) {
    // TODO: update name
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
