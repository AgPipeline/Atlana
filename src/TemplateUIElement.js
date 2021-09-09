/**
 * @fileoverview Generates UI components for templated fields
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import './TemplateUIElement.css';

/**
 * Generates UI components using templated information
 * @extends Component
 */
class TemplateUIElement extends Component {

  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
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

    this.default_id_prefix = ((this.props.id_prefix !== undefined) && this.props.id_prefix) ? '' + this.props.id_prefix : 'template_item_';
    this.item_id = ((this.props.id !== undefined) && this.props.id) ? this.props.id : null;
  }

  /**
   * Callback function for handling a browse request
   * @callback TemplateUIElement~BrowseRequestCallback
   * @param {Object} ev - the triggering event
   * @param {string} element_id - the ID of the element associated with the browse request (not the button)
   * @param {Object} item - the template item used to generate the UI
   */

  /**
   * Common UI generator for folders and files (with a browse button)
   * @param {Object} item - the template item to render
   * @param {Object[]} choices - choices available for selection
   * @param {string} choices.name - the name of the choice
   * @param {string} choices.location - the path of the file/folder
   * @param {string} choices.id - the ID of the choice
   * @param {TemplateUIElement~BrowseRequestCallback} browse_cb - called when the user wants to browse
   */
  generateBrowseUI(item, choices, browse_cb) {
    var default_string = null;
    var props = {};
    var name_value_map = {};
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const have_browse_callback = (typeof browse_cb === 'function') ? true : false;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    if (item.default !== undefined) {
      default_string = item.default.location;
      if (choices && choices.find((val) => val === item.default) === undefined) {
        choices = [...choices, item.default];
      }
    }

    if (!choices || (choices.length <= 0)) {
      props.disabled = 'disabled';
    }

    if (is_mandatory) {
      props.required = 'required';
    }

    if (typeof this.props.change === 'function') {
      if (choices && choices.length > 0) {
        choices.forEach((item, idx) => {name_value_map[item.name + '_' + idx] = item.location;});
      }

      props.onChange = (ev) => {
        const location = name_value_map[ev.target.value] !== undefined ? name_value_map[ev.target.value] : null;
        this.props.change(ev, location);
      };
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <select name={element_id} id={element_id} className="template-ui-table-select" {...props}>
          {choices && choices.map((item, idx) => {
            let option_props = {}
            if (default_string && (default_string === item.location)) {
              option_props.selected = 'true';
            }
            return (
              <option key={item.name + '_' + idx} {...option_props}
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

  /**
   * Returns the UI for File templates
   */
  generateFileUI() {
    const item = this.props.template;
    return this.generateBrowseUI(item, this.props.files, this.props.browse);
  }

  /**
   * Returns the UI for Float value templates
   */
  generateFloatUI() {
    const item = this.props.template;
    const minimum = item.lowerbound !== undefined ? item.lowerbound : null;
    const maximum = item.upperbound !== undefined ? item.upperbound : null;
    const step = item.step !== undefined ? item.step : '0.01';
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    if (minimum) props.min = '' + minimum;
    if (maximum) props.max = '' + maximum;
    if (step) props.step  = '' + step; 
    if (item.default !== undefined) {
      props.defaultValue = item.default;
    }
    if (is_mandatory) {
      props.required = 'required';
    }
    if (typeof this.props.change === 'function') {
      props.onChange = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <input id={element_id} type="number" size="15" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  /**
   * Returns the UI for Folder templates
   */
  generateFolderUI() {
    const item = this.props.template;
    return this.generateBrowseUI(item, this.props.folders, null);
  }

  /**
   * Returns the UI for Integer templates
   */
  generateIntegerUI() {
    const item = this.props.template;
    const minimum = item.lowerbound !== undefined ? item.lowerbound : null;
    const maximum = item.upperbound !== undefined ? item.upperbound : null;
    const step = item.step !== undefined ? item.step : null;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    if (minimum) props.min = '' + minimum;
    if (maximum) props.max = '' + maximum;
    if (step) props.step  = '' + step; 
    if (item.default !== undefined) {
      props.defaultValue = item.default;
    }
    if (is_mandatory) {
      props.required = 'required';
    }
    if (typeof this.props.change === 'function') {
      props.onChange = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'}  className="template-ui-table-value-wrapper">
        <input id={element_id} type="number" size="15" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  /**
   * Returns the UI indicator for required templates
   * @param {bool} is_mandatory - flag indicating that the field is mandatory; assumed to true if null or undefined
   */
  generateMandatoryUI(is_mandatory) {
    const cur_mandatory = is_mandatory || (is_mandatory === null) || (is_mandatory === undefined);
    return (<span className="template-ui-value-mandatory">{cur_mandatory ? '*' : ' '}</span>);
  }

  /**
   * Returns the UI for a text value entry template (can include specific choices for selection)
   */
  generatePlainUI() {
    const item = this.props.template;
    const min_length = item.minlength !== undefined ? item.minlength : null;
    const max_length = item.maxlength !== undefined ? item.maxlength : null;
    const is_dropdown = item.choices !== undefined;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    var default_string = null;
    if (item.default !== undefined) {
      props.defaultValue = item.default;
      default_string = props.defaultValue;
    }
    if (is_mandatory) {
      props.required = 'required';
    }
    if (typeof this.props.change === 'function') {
      props.onChange = this.props.change;
    }

    if (!is_dropdown) {
      if (min_length) props.minLength = '' + min_length;
      if (max_length) props.maxLength = '' + max_length;

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
                option_props.selected = 'true';
              }
              return(<option key={item.name + '.' + value} value={value} {...option_props}>{value}</option>);})
            }
          </select>
          {this.generateMandatoryUI(is_mandatory)}
        </div>
      );
    }
  }

  /**
   * Returns the UI for a Password template
   */
  generatePasswordUI() {
    const item = this.props.template;
    const min_length = item.minlength !== undefined ? item.minlength : null;
    const max_length = item.maxlength !== undefined ? item.maxlength : null;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    // TODO: Add checkbox for showing password in plain text
    var props = {};
    if (min_length) props.minLength = '' + min_length;
    if (max_length) props.maxLength = '' + max_length;
    if (item.default !== undefined) {
      props.defaultValue = item.default;
    }
    if (is_mandatory) {
      props.required = 'required';
    }
    if (typeof this.props.change === 'function') {
      props.onChange = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <input id={element_id} type="password" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  /**
   * Returns the UI for Secret templates (not a password, but needs to be hidden)
   */
  generateSecretUI() {
    const item = this.props.template;
    const min_length = item.minlength !== undefined ? item.minlength : null;
    const max_length = item.maxlength !== undefined ? item.maxlength : null;
    const is_mandatory = item.mandatory !== undefined ? item.mandatory : true;
    const element_id = this.item_id !== null ? this.item_id : this.default_id_prefix + item.name;
    if (this.props.new_id) this.props.new_id(item, element_id);

    var props = {};
    if (min_length) props.minLength = '' + min_length;
    if (max_length) props.maxLength = '' + max_length;
    if (item.default !== undefined) {
      props.defaultValue = item.default;
    }
    if (is_mandatory) {
      props.required = 'required';
    }
    if (typeof this.props.change === 'function') {
      props.onChange = this.props.change;
    }

    return (
      <div id={element_id + '_wrapper'} className="template-ui-table-value-wrapper">
        <input id={element_id} type="password" className="template-ui-table-value" {...props}></input>
        {this.generateMandatoryUI(is_mandatory)}
      </div>
    );
  }

  /**
   * Returns the UI representing the specific Template type
   */
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

  /**
   * Returns the UI for the template (includes template specific UI)
   */
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
