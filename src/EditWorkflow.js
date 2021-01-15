import React, { Component } from 'react';
import "./EditWorkflow.css"

var parts = [
      {name: "Soil Mask", id: "soilmask"},
      {name: "Plot Clip", id: "plotclip"},
      {name: "Find Files", id: "file_discovery", options: {filename: "orthomosaic_mask.tif"}},
      {name: "Canopy Cover", id: "canopycover", type: 'plot'},
      {name: "Merge CSV", id: "combine_csv"},
      ]

var plots = [
  {id: 1, name: "Canopy Cover"},
  {id: 2, name: "Greenness Calculations"},
  {id: 3, name: "Sum Pixels"},
];

class EditWorkspace extends Component {
  constructor(props) {
    super(props);

    this.editTitle = this.props.name === 'new' ? "New Workflow" : "Edit workflow " + this.props.name;
    this.editName = this.props.name === 'new' ? "New Workflow" : this.props.name;

    this.state = {
    }
  }

  getWorkflowStep(item, idx) {
    if (item.hasOwnProperty('type')) {
      return (
        <tr key={item.id} >
          <td>{idx}</td>
          <td key={item.id} >
            <select id={"workflow_" + item.id} className="workflow-step-choice" defaultValue={plots[0]} >
              {plots.map((item) => {return(<option value={item.id} >{item.name}</option>);})}
            </select>
          </td>
        </tr>
        );
    } else if (item.hasOwnProperty('options')){
      return (
        <tr key={item.id} >
          <td>{idx}</td>
          <td >
            <div id={"workflow_item_wrapper_" + item.id} className="workflow_item_wrapper">
              <span id={"workflow_item_name_" + item.id} className="workflow_item_name">{item.name}</span>
              <input type="text" defaultValue={item.options.filename} className="workflow_item_edit" />
            </div>
          </td>
        </tr>
        );
    }

    return (<tr key={item.id}><td>{idx}</td><td id={"workflow_" + item.id} >{item.name}</td></tr>);
  }

  render() {
    return (
      <div id="edit_workflow_wrapper" className="edit-workflow-wrapper">
        <div id="edit_title" className="edit-title">{this.editTitle}</div>
        <div name="field_wrapper" className="edit-field-wrapper">
          <div name="field_edit_item" className="field-edit-item">
            <label className="field-name-label">Name
              <input id="field_name" type="text" className="field-name-edit" defaultValue={this.editName} />
            </label>
          </div>
          <div name="field_edit_item" className="field-edit-item">
            <span id="save_edit" className="save-edit">Save</span>
          </div>
        </div>
        <div id="workflow_wrapper" className="workflow-wrapper">
          <table id="workflow_table" className="workflow-table">
            <thead className="workflow-title-row">
              <tr className="workflow-title">
                <th>Step</th>
                <th>Algorithms</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(this.getWorkflowStep)}
            </tbody>
          </table>
        </div>
      </div>
      );
  }
}

export default EditWorkspace;
