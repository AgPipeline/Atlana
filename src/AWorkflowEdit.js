// Workflow interface
import {Component} from 'react';
import workflowDefinitions from './WorkflowDefinitions';
import './AWorkflowEdit.css';

class AWorkflowEdit extends Component {
  constructor(props) {
    super(props);

    console.log(props);

    this.generateMandatoryUI = this.generateMandatoryUI.bind(this);
    this.generatePlainUI = this.generatePlainUI.bind(this);
    this.generatePasswordUI = this.generatePasswordUI.bind(this);
    this.generateSecretUI = this.generateSecretUI.bind(this);
    this.generateWorkflowItem = this.generateWorkflowItem.bind(this);
    this.generateWorkflowStep = this.generateWorkflowStep.bind(this);
    this.generateWorkflowUI = this.generateWorkflowUI.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onOk = this.onOk.bind(this);

    let cur_name = this.props.edit_item ? this.props.edit_item.name : this.props.title;

    this.state = {
      name: cur_name,           // The working name
      missing_data: false,      // Flag indicating we're missing data
    };
  }

  generated_ids = [];           // IDs of all elements we generated
  mandatory_check_ids = [];     // IDs of mandatory elements we generated

  generateMandatoryUI() {
    return (<span className="workflow-edit-interface-value-mandatory">*</span>);
  }

  generatePlainUI(item) {
    var props = {};
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_dropdown = item.hasOwnProperty('choices');
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;

    if (!is_dropdown) {
      const element_id = 'file_edit_interface_table_value_' + item.name;
      this.generated_ids.push(element_id);

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
          {is_mandatory && this.generateMandatoryUI()}
        </div>
      );
    } else {
      const element_id = 'file_edit_interface_table_' + item.name;
      this.generated_ids.push(element_id);

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
          {is_mandatory && this.generateMandatoryUI()}
        </div>
      );
    }
  }

  generateSecretUI(item) {
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = 'file_edit_interface_table_value_' + item.name;
    this.generated_ids.push(element_id);

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
        {is_mandatory && this.generateMandatoryUI()}
      </div>
    );
  }

  generatePasswordUI(item) {
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = 'file_edit_interface_table_value_' + item.name;
    this.generated_ids.push(element_id);

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
        {is_mandatory && this.generateMandatoryUI()}
      </div>
    );
  }

  generateWorkflowItem(item, idx) {
    switch(item.type) {
      case 'integer':
        return null;

      case 'float':
        return null;

      default:
      case 'plain':
        return this.generatePlainUI(item);

      case 'secret':
        return this.generateSecretUI(item);

      case 'password':
        return this.generatePasswordUI(item);

      case 'file':
        return null;

      case 'folder':
        return null;
    }
  }

  generateWorkflowStep(item, idx) {
    return (
      <tr id={'workflow_edit_interface_table_row_' + item.name} key={item.name} className="workflow-detail-row">
        {item.fields.map((item, idx) => {
          return (
            <>
              <td id={'workflow_edit_interface_table_name_' + item.name} className="workflow-edit-interface-table-item workflow-edit-interface-table-prompt">{item.prompt}</td>
              <td id={'workflow_edit_interface_table_type_' + item.name} className="workflow-edit-interface-table-item workflow-edit-interface-table-value">
                {this.generateWorkflowItem(item)}
              </td>
            </>
          );
        })}
      </tr>
    );
  }

  generateWorkflowUI(template) {
    this.mandatory_check_ids = [];
    this.authentication_ids = [];

    return (
      <div id="workflow_edit_interface_wrapper" className="workflow-edit-interface-wrapper">
        <table id="workflow_edit_interface_table" className="workflow-edit-interface-table">
            <tbody>
              {template.steps.map(this.generateWorkflowStep)}
            </tbody>
        </table>
      </div>
    );
  }

  onCancel() {
    this.props.onCancel();
  }

  onNameUpdated(ev) {
    this.setState({name: ev.target.value});
  }

  onOk() {

  }

  render() {
    const cur_name = this.state.name;
    const missing_data = this.missing_data;//!this.state.mandatory_fields_filled;
    const ok_button_disabled = missing_data;
    const ok_button_classes = 'workflow-edit-button workflow-edit-ok ' + (ok_button_disabled ? 
                                            'workflow-edit-button-disabled workflow-edit-ok-disabled' : '');

    return (
      <div id="workflow_edit_background" className="workflow-edit-background">
        <div className="workflow-edit-spacing"></div>
        <div id="workflow_edit_wrapper" className="workflow-edit-wrapper">
          <div id="workflow_edit_titlebar" className="workflow-edit-titlebar">
            <div id="workflow_edit_titlebar_left" className="workflow-edit-titlebar-left"></div>
            <div id="workflow_edit_titlebar_center" className="workflow-edit-titlebar-center">{this.props.title}</div>
            <div id="workflow_edit_titlebar_right" className="workflow-edit-titlebar-right">
              <div id="workflow_edit_titlebar_cancel" className="workflow-edit-titlebar-close" onClick={this.onCancel} >x</div>
            </div>
          </div>
          <div id="workflow_edit_name_wrapper" className="workflow-edit-name-wrapper">
            <div id="workflow_edit_name_prompt" className="workflow-edit-name-prompt">Name</div>
            <div id="workflow_edit_name_edit_wrapper" className="workflow-edit-name-edit-wrapper">
              <input id="workflow_edit_name_edit" type="text" maxLength="150" value={cur_name} onChange={this.onNameUpdated}
                     className="workflow-edit-name-edit"></input>
            </div>
            {this.generateMandatoryUI()}
          </div>
          {this.generateWorkflowUI(this.props.template)}
          <div name="workflow_edit_footer" className="workflow-edit-footer">
            <div name="workflow_edit_ok" className={ok_button_classes} onClick={missing_data ? null : this.onOk}>OK</div>
            <div name="workflow_edit_spacer" className="workflow-edit-footer-spacer"></div>
            <div name="workflow_edit_cancel" className="workflow-edit-button workflow-edit-cancel" onClick={this.onCancel}>Cancel</div>
          </div>
        </div>
        <div className="workflow-edit-spacing"></div>
      </div>
    );
  }
}

export default AWorkflowEdit;
