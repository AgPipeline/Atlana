// Templated UI generator
import {Component} from 'react';
import './TemplateUIElement.css';

class TemplateUIElement extends Component {
  constructor(props) {
    super(props);

    this.generateBrowseUI = this.generateBrowseUI.bind(this);
    this.generateFileUI = this.generateFileUI.bind(this);
    this.generateFloatUI = this.generateFloatUI.bind(this);
    this.generateFolderUI = this.generateFolderUI.bind(this);
    this.generateIntegerUI = this.generateIntegerUI.bind(this);
    this.generateMandatoryUI = this.generateMandatoryUI.bind(this);
    this.generatePlainUI = this.generatePlainUI.bind(this);
    this.generatePasswordUI = this.generatePasswordUI.bind(this);
    this.generateSecretUI = this.generateSecretUI.bind(this);
    this.generateWorkflowItem = this.generateWorkflowItem.bind(this);

    this.default_id_prefix = this.props.hasOwnProperty('id_prefix') && this.props.id_prefix ? '' + this.props.id_prefix : 'template_item_';
    this.item_id = this.props.hasOwnProperty('id') && this.props.id ? this.props.id : null;
  }

  generateBrowseUI(item, choices, browse_cb) {
    var default_string = null;
    var props = {};
    var name_value_map = {};
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const have_browse_callback = (typeof browse_cb === 'function') ? true : false;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    if (item.hasOwnProperty('default')) {
      default_string = item.default['location'];
      if (choices && choices.find((val) => val === item.default) === undefined) {
        choices = [...choices, item.default];
      }
    }

    if (!choices || (choices.length <= 0)) {
      props['disabled'] = 'disabled';
    }

    if (is_mandatory) {
      props['required'] = 'required';
    }

    if (typeof this.props.change === 'function') {
      if (choices && choices.length > 0) {
        choices.forEach((item, idx) => {name_value_map[item.name + '_' + idx] = item.location;});
      }

      props['onChange'] = (ev) => {
        const location = name_value_map.hasOwnProperty(ev.target.value) ? name_value_map[ev.target.value] : null;
        this.props.change(ev, location);
      };
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <select name={element_id} id={element_id} className="template-ui-table-select" {...props}>
          {choices && choices.map((item, idx) => {
            let option_props = {}
            if (default_string && (default_string === item.location)) {
              option_props['selected'] = 'true';
            }
            return (
              <option value={item.name + '_' + idx} key={item.name + '_' + idx} {...option_props}
                      className="template-ui-table-value-option template-ui-table-value-option-item">{item.location}</option>
            );}
          )}
        </select>
        {have_browse_callback && 
            <div id={this.default_id_prefix + 'browse_' + item.id} className="template-ui-table-browse"
                 onClick={(ev) => browse_cb(ev, element_id, item)}>
              ...
            </div>
        }
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  generateFileUI() {
    const item = this.props.template;
    return this.generateBrowseUI(item, this.props.files, this.props.browse);
  }

  generateFloatUI() {
    const item = this.props.template;
    const minimum = item.hasOwnProperty('lowerbound') ? item.lowerbound : null;
    const maximum = item.hasOwnProperty('upperbound') ? item.upperbound : null;
    const step = item.hasOwnProperty('step') ? item.step : '0.01';
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    if (minimum) props['min'] = '' + minimum;
    if (maximum) props['max'] = '' + maximum;
    if (step) props['step']  = '' + step; 
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
    }
    if (is_mandatory) {
      props['required'] = 'required';
    }
    if (typeof this.props.change === 'function') {
      props['onChange'] = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <input id={element_id} type="number" size="15" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  generateFolderUI() {
    const item = this.props.template;
    return this.generateBrowseUI(item, this.props.folders, null);
  }

  generateIntegerUI() {
    const item = this.props.template;
    const minimum = item.hasOwnProperty('lowerbound') ? item.lowerbound : null;
    const maximum = item.hasOwnProperty('upperbound') ? item.upperbound : null;
    const step = item.hasOwnProperty('step') ? item.step : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    if (minimum) props['min'] = '' + minimum;
    if (maximum) props['max'] = '' + maximum;
    if (step) props['step']  = '' + step; 
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
    }
    if (is_mandatory) {
      props['required'] = 'required';
    }
    if (typeof this.props.change === 'function') {
      props['onChange'] = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'}  className="template-ui-table-value-wrapper">
        <input id={element_id} type="number" size="15" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  generateMandatoryUI(is_mandatory) {
    const cur_mandatory = is_mandatory || (is_mandatory === null) || (is_mandatory === undefined);
    return (<span className="template-ui-value-mandatory">{cur_mandatory ? '*' : ' '}</span>);
  }

  generatePlainUI() {
    const item = this.props.template;
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_dropdown = item.hasOwnProperty('choices');
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    var default_string = null;
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
      default_string = props['defaultValue'];
    }
    if (is_mandatory) {
      props['required'] = 'required';
    }
    if (typeof this.props.change === 'function') {
      props['onChange'] = this.props.change;
    }

    if (!is_dropdown) {
      if (min_length) props['minLength'] = '' + min_length;
      if (max_length) props['maxLength'] = '' + max_length;

      return (
        <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
          <input id={element_id} type="text" size="50" className="template-ui-table-value" {...props}></input>
          {this.generateMandatoryUI(is_mandatory)}
        </div>
      );
    } else {

      return (
        <div id="workflow_edit_interface_table_value_wrapper" className="template-ui-table-value-wrapper">
          <select id={element_id} {...props}>
            {item.choices.map((value) => {
              let option_props = {}
              if (default_string && (default_string === value)) {
                option_props['selected'] = 'true';
              }
              return(<option key={item.name + '.' + value} value={value} {...option_props}>{value}</option>);})
            }
          </select>
          {this.generateMandatoryUI(is_mandatory)}
        </div>
      );
    }
  }

  generatePasswordUI() {
    const item = this.props.template;
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    // TODO: Add checkbox for showing password in plain text
    var props = {};
    if (min_length) props['minLength'] = '' + min_length;
    if (max_length) props['maxLength'] = '' + max_length;
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
    }
    if (is_mandatory) {
      props['required'] = 'required';
    }
    if (typeof this.props.change === 'function') {
      props['onChange'] = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <input id={element_id} type="password" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  generateSecretUI() {
    const item = this.props.template;
    const min_length = item.hasOwnProperty('minlength') ? item.minlength : null;
    const max_length = item.hasOwnProperty('maxlength') ? item.maxlength : null;
    const is_mandatory = item.hasOwnProperty('mandatory') ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    if (min_length) props['minLength'] = '' + min_length;
    if (max_length) props['maxLength'] = '' + max_length;
    if (item.hasOwnProperty('default')) {
      props['defaultValue'] = item.default;
    }
    if (is_mandatory) {
      props['required'] = 'required';
    }
    if (typeof this.props.change === 'function') {
      props['onChange'] = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <input id={element_id} type="password" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  generateWorkflowItem() {

    switch(this.props.template.type) {
      case 'integer':
        return this.generateIntegerUI();

      case 'float':
        return this.generateFloatUI();

      default:
      case 'plain':
        return this.generatePlainUI();

      case 'secret':
        return this.generateSecretUI();

      case 'password':
        return this.generatePasswordUI();

      case 'file':
        return this.generateFileUI();

      case 'folder':
        return this.generateFolderUI();
    }
  }

  render() {
    const base_id = this.default_id_prefix + this.props.template.name;

    return (
      <>
        <td id={base_id + '_prompt'} className="template-ui-table-item template-ui-table-prompt">{this.props.template.prompt}</td>
        <td id={base_id + '_value_cell'} className="template-ui-table-item template-ui-table-value-cell">
          {this.generateWorkflowItem()}
        </td>
      </>
    );
  }
}

export default TemplateUIElement;
