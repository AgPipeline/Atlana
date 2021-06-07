/**
 * @fileoverview Algorithm editing interface
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import Utils from './Utils.js';
import './AAlgorithmEdit.css';

/**
 * The fieelds needed for the algorithms
 */
var algo_fields = [
  {
    name: 'var_name',
    prompt: 'Author',
    description: 'The author of the algorithm',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_email',
    prompt: 'Email',
    description: 'Email address of the author',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_contributors',
    prompt: 'Contributors',
    description: 'Name of other contributors',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_algo_name',
    prompt: 'Algorithm name',
    description: 'Name of the algorithm',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_algo_description',
    prompt: 'Algorithm description',
    description: 'Describe the algorithm',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_citation_author',
    prompt: 'Citation author',
    description: 'The author to cite',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_citation_title',
    prompt: 'Citation title',
    description: 'The title of the citation',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_citation_year',
    prompt: 'Citation year',
    description: 'The year of the citation',
    minLength: 2,
    maxlength: 4,
    type: 'plain',
    mandatory: false,
  }
];

var algo_return_ids = {
  return_names: 1,
  return_units: 2,
  return_labels: 3,
};

var algo_returns = [
  {
    name: 'return_names',
    prompt: 'VARIABLE_NAMES',
    description: 'Name of variables that are returned',
    return_id: algo_return_ids.return_names,
    type: 'plain',
    mandatory: false,
  }, {
    name: 'return_units',
    prompt: 'VARIABLE_UNITS',
    description: 'Units associated with returned variables',
    return_id: algo_return_ids.return_units,
    type: 'plain',
    mandatory: false,
  }, {
    name: 'return_labels',
    prompt: 'VARIABLE_LABELS',
    description: 'Labels for returned variables',
    return_id: algo_return_ids.return_labels,
    type: 'plain',
    mandatory: false,
  }
];

var algo_modes = {
  main: 1,
  edit_fields: 2,
  edit_variables: 3,
};

/**
 * Implements the UI for editing algorithms
 * @extends Component
 */
class AAlgorithmEdit extends Component {

  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.editFields = this.editFields.bind(this);
    this.editReturnField = this.editReturnField.bind(this);
    this.editReturnFieldBlur = this.editReturnFieldBlur.bind(this);
    this.editVariables = this.editVariables.bind(this);
    this.generateAlgorithmFieldsEdit = this.generateAlgorithmFieldsEdit.bind(this);
    this.generateAlgorithmFieldsList = this.generateAlgorithmFieldsList.bind(this);
    this.generateReturnVariablesEdit = this.generateReturnVariablesEdit.bind(this);
    this.generateReturnVariablesList = this.generateReturnVariablesList.bind(this);
    this.handleDocumentKey = this.handleDocumentKey.bind(this);
    this.onUpdatedFieldValue = this.onUpdatedFieldValue.bind(this);

    window.ace.config.setModuleUrl("ace/mode/python", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-python.min.js")

    this.editor = null;                 // The editor element
    this.editor_cursor_position = null; // The working editor cursor position
    this.editor_selection_range = null; // The working editor selection range
    this.editing_return_field = false;  // Flag used to indicate we're editing a return field

    // Setup default values
    let current_return_variables = {};
    current_return_variables[algo_returns[0].name] = ['channel_size'];
    current_return_variables[algo_returns[1].name] = ['pixels'];
    current_return_variables[algo_returns[2].name] = ['Channel Size'];

    this.state = {
      mode: algo_modes.main,        // The current display mode
      current_field_values: {},     // Current values for fields
      current_return_variables,     // The return variabless
    };
  }

  static ADD_NEW_RETURN_IDX = 99999999; // Used to add a new return value

  /**
   * Called after the component has rendered
   */
  componentDidMount() {
    this.editor = window.ace.edit('algorithm_edit_editor', {
                                    selectionStyle: "text"
                                  });
    this.editor.session.setMode('ace/mode/python');

    // When the editor gains focus, set the state to editing
    this.editor.on('focus', () => {
      console.log("EDITOR FOCUS CALLBACK");
      if (this.state.mode !== algo_modes.main) {
        console.log("Setting mode");
        this.setState({mode: algo_modes.main});
      }
    });

    // Get the template associated with the laguage and algorithm type
    this.getStartingTemplate(this.props.lang, this.props.type);

    document.addEventListener('keydown',  this.handleDocumentKey, false);
  }

  /**
   * Called just before this component is unmounted and still displaying
   */
  componentWillUnmount() {
    document.removeEventListener('keydown',  this.handleDocumentKey, false);
  }

  /**
   * Called when the user wants to edit the fields
   */
  editFields() {
    this.setState({mode: algo_modes.edit_fields});
  }
  
  editReturnFieldBlur(ev, blur_cb, edit_el, return_type, type_index) {
    // Hide the editing element and stop listening to events
    edit_el.removeEventListener('blur', blur_cb);
    edit_el.style.display = 'none';

    // Check that we have a value
    if (!ev.target.value || ev.target.value.length <= 0 || ev.target.value.trim().length <=  0) {
      return;
    }
    const new_value = ev.target.value.trim();

    // Try to find what we're updating by type
    const return_info = algo_returns.find((item) => item.return_id === return_type);
    if (!return_info) {
      // TODO: error
      return;
    }

    // Find the item to update, or add a new entry
    let added_new_return = false;
    let cur_return_variables = this.state.current_return_variables;
    let cur_values = cur_return_variables.hasOwnProperty(return_info.name) ? cur_return_variables[return_info.name] : undefined;
    if (cur_values) {
      if (cur_values.length <= type_index && type_index !== AAlgorithmEdit.ADD_NEW_RETURN_IDX) {
        // TODO: error
        return;
      }
      if (type_index !== AAlgorithmEdit.ADD_NEW_RETURN_IDX) {
        cur_values[type_index] = new_value;
      } else {
        // Add new empty entries to the rest of the fields
        cur_values.push(new_value);
        added_new_return = true;
      }
    } else {
      cur_values = [new_value];
      added_new_return = true;
    }
    cur_return_variables[return_info.name] = cur_values;

    // Check if we added a new name and update the rest of the fields
    if (added_new_return) {
      for (let i = 0; i < algo_returns.length; i++) {
        if (algo_returns[i].return_id !== return_type) {
          const cur_name = algo_returns[i].name;
          if (cur_return_variables.hasOwnProperty(cur_name)) {
            cur_return_variables[cur_name].push('');
          } else {
            cur_return_variables[cur_name] = [''];
          }
        }
      }
    }

    // Update the state
    this.setState({current_return_variables: cur_return_variables});
  }

  editReturnField(field_id, initial_value, type, type_index) {
    let el = document.getElementById(field_id);
    if (!el) {
      return;
    }

    // Position our editing element
    let edit_el = document.getElementById('algorithm_edit_return_edit_field');
    if (!edit_el) {
      // TODO: Report error
      return;
    }

    // Position the editing field
     let el_rect = el.getBoundingClientRect();
     let blur_cb = (ev) => {this.editing_return_field = false; this.editReturnFieldBlur(ev, blur_cb, edit_el, type, type_index)};

     edit_el.style.display = 'initial';
     edit_el.style.top = el_rect.y + 'px';
     edit_el.style.left = el_rect.x + 'px';
     edit_el.style.width = el_rect.width + 'px';
     edit_el.style.height = el_rect.height + 'px';
     edit_el.value = initial_value;
     edit_el.addEventListener('blur', blur_cb);
     edit_el.focus();

     // Indicate that we're editing a return value
     this.editing_return_field = true;
  }

  /**
   * Called when the user wants to edit the return variables
   */
  editVariables() {
    this.setState({mode: algo_modes.edit_variables});
  }

  /**
   * Returns the UI for editing algorithm fields
   * @param {Object} field_item - the field to generate the UI  for
   * @param {string} field_item.name - the name of the field
   * @param {string} field_item.prompt - the prompt to display for the field
   * @param {string} field_item.description - the description of the field (used as a placeholder)
   * @param {int} idx - the index of the item to generate the UI for
   */
  generateAlgorithmFieldsEdit(field_item, idx) {
    if (!this.editor_cursor_position) {
      this.editor_cursor_position = this.editor.getCursorPosition();
      this.editor_selection_range = this.editor.getSelectionRange();
    }

    let props = {size: '30'};
    if (this.state.current_field_values[field_item.name]) {
      props.value = this.state.current_field_values[field_item.name];
    } else {
      props.value = '';
    }

    return(
          <div id="algorithm_field_wrapper" className="algorithm-field-wrapper" key={field_item.name}>
            <div id={'algorithm_field_' + field_item.name} className="algorithm-field-prompt">{field_item.prompt}</div>
            <input type="text"
                   id={'algorithm_field_' + field_item.name + '_value_edit'}
                   className="algorithm-field-value-edit"
                   placeholder={field_item.description}
                   {...props}
                   onChange={(ev) => void this.onUpdatedFieldValue(ev, field_item)}
                   >
            </input>
          </div>
    );
  }

  /**
   * Returns the UI for listing algorithm fields
   * @param {Object} field_item - the field to generate the UI  for
   * @param {string} field_item.name - the name of the field
   * @param {string} field_item.prompt - the prompt to display for the field
   * @param {int} idx - the index of the item to generate the UI for
   */
  generateAlgorithmFieldsList(field_item, idx) {
    const field_value = this.state.current_field_values[field_item.name] ? this.state.current_field_values[field_item.name] : '';

    return(
          <div id="algorithm_field_wrapper" className="algorithm-field-wrapper" key={field_item.name}>
            <div id={'algorithm_field_' + field_item.name} className="algorithm-field-prompt">{field_item.prompt}&nbsp;=&nbsp;</div>
            <div id={'algorithm_field_' + field_item.name + '_value'} className="algorithm-field-value">{field_value}</div>
          </div>
    );
  }

  /**
   * Generates the entry fields for the algorithm
   */
  generateAlgorithmFieldsUI() {
    const map_handler = this.state.mode === algo_modes.edit_fields ? this.generateAlgorithmFieldsEdit : this.generateAlgorithmFieldsList;
    const prop_wrapper_extra_class = this.state.mode === algo_modes.edit_fields ? " algorithm-edit-prop-wrapper-edit" : " algorithm-edit-prop-wrapper-list";

    return (
        <div id="algorithm_edit_prop_wrapper" className={'algorithm-edit-prop-wrapper' + prop_wrapper_extra_class}>
          <div id="algorithm_field_edit_wrapper" className="algorithm-field-edit-wrapper">
            <div id="algorithm_field_edit_prompt" className="algorithm-field-edit-prompt"></div>
            <div className="algorithm-field-edit-spacer"></div>
            {this.state.mode !== algo_modes.edit_fields && <div id="algorithm_field_edit_button" className="algorithm-field-edit-button" onClick={this.editFields}>Edit</div>}
          </div>
          {algo_fields.map(map_handler)}
        </div>
      );
  }

  /**
   * Returns the display elements for editing return value items
   */
  generateReturnVariablesEdit() {
    if (!this.editor_cursor_position) {
      this.editor_cursor_position = this.editor.getCursorPosition();
      this.editor_selection_range = this.editor.getSelectionRange();
    }

    const defined_names = algo_returns.find((item) => item.return_id === algo_return_ids.return_names && this.state.current_return_variables[item.name]);
    let cur_names = [];
    let cur_units = [];
    let cur_labels = [];
    if (defined_names) {
      cur_names = this.state.current_return_variables[defined_names.name];
      const defined_units = algo_returns.find((item) => item.return_id === algo_return_ids.return_units && this.state.current_return_variables[item.name]);
      const defined_labels = algo_returns.find((item) => item.return_id === algo_return_ids.return_labels && this.state.current_return_variables[item.name]);
      if (defined_units) {
        cur_units = this.state.current_return_variables[defined_units.name];
      }
      if (defined_labels) {
        cur_labels = this.state.current_return_variables[defined_labels.name];
      }
    }

    return (
      <div id="return_variables_edit_wrapper" className="return-variables-wrapper return-variables-wrapper-edit">
        <div id="return_variables_edit_instructions" className="return-variables-edit-instructions">
          Click on the cells to edit their values
        </div>
        <table id="algorithm_edit_return_table" className="algorithm-edit-return-table">
          <thead>
            <tr>
              {['Name', 'Units', 'Label'].map((item) => <th key={item} className="algorithm-edit-return-table-heading">{item}</th>)}
            </tr>
          </thead>
          <tbody>
          {[...Array(cur_names.length).keys()].map((idx) =>
                {
                  const name = cur_names.length > idx ? cur_names[idx] : '';
                  const unit = cur_units.length > idx ? cur_units[idx] : '';
                  const label = cur_labels.length > idx ? cur_labels[idx] : '';
                  const name_id = 'algorithm_edit_return_name_' + idx;
                  const unit_id = 'algorithm_edit_return_unit_' + idx;
                  const label_id = 'algorithm_edit_return_label_' + idx;
                  return (
                    <tr>
                      <td id={name_id}
                          className="algorithm_edit_return_cell algorithm_edit_return_name"
                          onClick={() => void this.editReturnField(name_id, name, algo_return_ids.return_names, idx)}>
                        {name}
                      </td>
                      <td id={unit_id}
                          className="algorithm_edit_return_cell algorithm_edit_return_unit"
                          onClick={() => void this.editReturnField(unit_id, unit, algo_return_ids.return_units, idx)}>
                        {unit}
                      </td>
                      <td id={label_id}
                          className="algorithm_edit_return_cell algorithm_edit_return_label"
                          onClick={() => void this.editReturnField(label_id, label, algo_return_ids.return_labels, idx)}>
                        {label}
                      </td>
                    </tr>
                  );
                }
          )}
          <tr>
            <td id={'algorithm_edit_return_name_new'} 
                className="algorithm_edit_return_cell algorithm_edit_return_name_new" 
                onClick={() => void this.editReturnField('algorithm_edit_return_name_new', '', algo_return_ids.return_names, AAlgorithmEdit.ADD_NEW_RETURN_IDX)}
            >
              &nbsp;
            </td>
            <td id={'algorithm_edit_return_unit_new'} className="algorithm_edit_return_cell"></td>
            <td id={'algorithm_edit_return_label_new'} className="algorithm_edit_return_cell"></td>
          </tr>
          </tbody>
        </table>
        <input id="algorithm_edit_return_edit_field" className="algorithm-edit-return-edit-field" style={{display:'none'}}></input>
      </div>
    );
  }

  /**
   * Returns the display elements for a return value item
   * @param {Object} return_item - the return item to display
   * @param {string} return_item.name - the name of the return item
   * @param {string} return_item.prompt - the prompt for displaying the return item
   */
  generateReturnVariablesList(return_item, idx) {
    const return_value = this.state.current_return_variables.hasOwnProperty(return_item.name) ? this.state.current_return_variables[return_item.name].join(',') : '';

    return (
      <div id="return_variables_definition_wrapper" className="return-variables-definition-wrapper">
        <div id="return_variables_definition_names" className="return-variables-definition-prompt">{return_item.prompt}&nbsp;=&nbsp;</div>
        <div id="return_variables_definition_names_value" className="return-variables-definition-value">{return_value}</div>
      </div>
    );
  }

  /**
   * Generate the UI for return variables
   */
  generateReturnVariablesUI() {

    if (this.state.mode !== algo_modes.edit_variables) {
      return (
        <div id="return_variables_wrapper" className="return-variables-wrapper return-variables-wrapper-list">
          <div id="return_variables_prompt_wrapper" className="return-variables-prompt-wrapper">
            <div id="return_variables_prompt" className="return-variables-prompt">Return variables</div>
            <div className="return-variables-spacer"></div>
            <div id="return_variables_edit_button" className="return-variables-edit-button" onClick={this.editVariables}>Edit</div>
          </div>
          {algo_returns.map(this.generateReturnVariablesList)}
        </div>
      );
    }

    return this.generateReturnVariablesEdit();
  }

  /**
   * Fetches the starting code template for the language and algorithm type
   * @param {string} lang - the programming language of the template
   * @param {int|string} algo - the algorithm type of the template
   */
  getStartingTemplate(lang, algo) {
    const uri = Utils.getHostOrigin().concat(`/template/${lang}/${algo}`);

    try {
      fetch(uri, {
        method: 'GET'
        }
      )
      .then(response => {if (response.ok) return response.text(); else throw response.statusText})
      .then(success => {this.editor.selectAll();this.editor.insert(success);  this.editor.moveCursorTo(6, 4);this.editor.selection.selectLineEnd();this.editor.focus();})
      .catch(error => {console.log("ERROR",error);});
    } catch (err) {
      console.log("Fetch starting template exception", err);
      throw err;
    }
  }

  /**
   * Handles the user pressing a key
   * @param {Object} ev - the triggering event
   * @param {string} ev.key - the key the user pressed
   */
  handleDocumentKey(ev) {
    switch(ev.key) {
      case 'Enter':
        if (this.editing_return_field === true) {
          // Save the current edit
          let el = document.getElementById('algorithm_edit_return_edit_field');
          if (el) {
            el.blur();
            ev.preventDefault()
          }
        }
        break;

      case 'Tab':
        if (this.editing_return_field === true) {
          // Save the current edit
          let el = document.getElementById('algorithm_edit_return_edit_field');
          if (el) {
            el.blur();
            ev.preventDefault()
          }
        }
        break;

      default: break;
    }
  }

  /**
   * Handles the a field value getting updated
   * @param {Object} ev - the triggering event
   * @param {string} ev.target.value - the updated value
   * @param {Object} field_item - the information on the field that was updated
   */
  onUpdatedFieldValue(ev, field_item) {
    var current_field_values =  this.state.current_field_values;

    current_field_values[field_item.name] = ev.target.value;

    this.setState({current_field_values})
  }

  /**
   * Returns the algorithm editing UI
   */
  render() {
    const editor_wrapper_class_name = this.state.mode === algo_modes.main ? 'algorithm-edit-edit-wrapper' : 'algorithm-edit-edit-wrapper-minimized';

    // Check if we need to restore the cursor position and other editing features
    if (this.state.mode === algo_modes.main && this.editor_cursor_position) {
      window.setTimeout(() => {
        if (this.editor_cursor_position) {
          const cur_cursor_pos = this.editor_cursor_position;
          console.log("CURSOR POS", cur_cursor_pos);
          this.editor_cursor_position = null;
          this.editor.moveCursorTo(cur_cursor_pos.row, cur_cursor_pos.column);
        }
        if (this.editor_selection_range) {
          const cur_selection_range = this.editor_selection_range;
          console.log("SELECTION RANGE", cur_selection_range);
          this.editor_selection_range = null;
          this.editor.selection.setSelectionRange(cur_selection_range, false);
        }
      }, 200);
    }

    // Return the UI
    return(
      <div id="algorithm_edit_wrapper" className="algorithm-edit-wrapper">
        <div id="algorithm_edit_variables_wrapper" className="algorithm-edit-variables-wrapper">
          {this.generateAlgorithmFieldsUI()}
          {this.generateReturnVariablesUI()}
        </div>
        <div id="algorithm_edit_edit_wrapper" className={editor_wrapper_class_name}>
          <div id="algorithm_edit_editor" className="algorithm-edit-editor">Loading template ...</div>
        </div>
      </div>
    );
  }
}

export default AAlgorithmEdit;
