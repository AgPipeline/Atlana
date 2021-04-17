// Workflow interface
import {Component} from 'react';
import WorkspaceTitlebar from './WorkspaceTitlebar';
import AWorkflowEdit from './AWorkflowEdit';
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

class AWorkflows extends Component {
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.finishAdd = this.finishAdd.bind(this);
    this.generateNewWorkspaceUI = this.generateNewWorkspaceUI.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.onCancelEdit = this.onCancelEdit.bind(this);
    this.updateNewType = this.updateNewType.bind(this);

    const workflow_defs = workflowDefinitions;

    this.state = {
      cur_item_index: null,         // The index of the new item to edit
      cur_item_name: null,          // The name of the new item
      cur_item_title: null,         // The title to display for the new item window
      edit_add: true,               // Flag used to determine if we're adding or editing an item
      edit_item: null,              // The item we're editing when we edit
      workflow_list: [],            // The list of defined workflows
      workflow_defs,                // The workflow definitions
    };
  }

  new_workflow_idx = null;         // The ID of a new workflow to specify

  addItem() {
    if (this.new_workflow_idx == null) {
      let el = document.getElementById('workflow_types');
      el.focus();
      return;
    }
    const cur_index = this.new_workflow_idx;
    let cur_name = this.state.workflow_defs[cur_index].name;

    this.setState({cur_item_index: cur_index, cur_item_name: cur_name, cur_item_title: 'New ' +  cur_name, edit_cb: this.finishAdd, 
                   edit_add: true, edit_item: null});
  }

  finishAdd() {

  }

  onCancelEdit() {
    this.setState({cur_item_index: null, cur_item_name: null, cur_item_title: null});
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

  generateNewWorkspaceUI() {
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

  render() {
    const cur_template = this.state.workflow_defs[this.state.cur_item_index];

    return (
      <>
        <div id="workflow_wrapper" className="workflow-wrapper">
          <WorkspaceTitlebar title="Manage image-based workflows" back={this.props.done} extra={this.generateNewWorkspaceUI}/>
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
        </div>
        {this.state.cur_item_index !== null && 
              <AWorkflowEdit title={this.state.cur_item_title} name={this.state.cur_item_name} template={cur_template}
                             onCancel={this.onCancelEdit}/>
        }
      </>
    );
  }
}

export default AWorkflows;
