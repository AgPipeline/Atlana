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
    name: 'var_version',
    prompt: 'Version',
    description: 'Version number for algorithm',
    variable_name: 'VERSION',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_name',
    prompt: 'Author',
    description: 'The author of the algorithm',
    variable_name: 'ALGORITHM_AUTHOR',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_email',
    prompt: 'Email',
    description: 'Email address of the author',
    variable_name: 'ALGORITHM_AUTHOR_EMAIL',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_contributors',
    prompt: 'Contributors',
    description: 'Name of other contributors',
    variable_name: 'ALGORITHM_CONTRIBUTORS',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_algo_name',
    prompt: 'Algorithm name',
    description: 'Name of the algorithm',
    variable_name: 'ALGORITHM_NAME',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_algo_description',
    prompt: 'Algorithm description',
    description: 'Describe the algorithm',
    variable_name: 'ALGORITHM_DESCRIPTION',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_citation_author',
    prompt: 'Citation author',
    description: 'The author to cite',
    variable_name: 'CITATION_AUTHOR',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_citation_title',
    prompt: 'Citation title',
    description: 'The title of the citation',
    variable_name: 'CITATION_TITLE',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'var_citation_year',
    prompt: 'Citation year',
    description: 'The year of the citation',
    minLength: 2,
    maxlength: 4,
    variable_name: 'CITATION_YEAR',
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
    variable_name: 'VARIABLE_NAMES',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'return_units',
    prompt: 'VARIABLE_UNITS',
    description: 'Units associated with returned variables',
    return_id: algo_return_ids.return_units,
    variable_name: 'VARIABLE_UNITS',
    type: 'plain',
    mandatory: false,
  }, {
    name: 'return_labels',
    prompt: 'VARIABLE_LABELS',
    description: 'Labels for returned variables',
    return_id: algo_return_ids.return_labels,
    variable_name: 'VARIABLE_LABELS',
    type: 'plain',
    mandatory: false,
  }
];

var algo_modes = {
  main: 1,
  edit_fields: 2,
  edit_variables: 3,
  test_code: 4,
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

    this.checkCodeChangedDuringCheck = this.checkCodeChangedDuringCheck.bind(this);
    this.checkCodeQuality = this.checkCodeQuality.bind(this);
    this.editFields = this.editFields.bind(this);
    this.editReturnField = this.editReturnField.bind(this);
    this.editReturnFieldBlur = this.editReturnFieldBlur.bind(this);
    this.editVariables = this.editVariables.bind(this);
    this.generateAlgorithmFieldsEdit = this.generateAlgorithmFieldsEdit.bind(this);
    this.generateAlgorithmFieldsList = this.generateAlgorithmFieldsList.bind(this);
    this.generateCodeIndicators = this.generateCodeIndicators.bind(this);
    this.generateEditorDisabled = this.generateEditorDisabled.bind(this);
    this.generateFooter = this.generateFooter.bind(this);
    this.generateReturnVariablesEdit = this.generateReturnVariablesEdit.bind(this);
    this.generateReturnVariablesList = this.generateReturnVariablesList.bind(this);
    this.generateTestResults = this.generateTestResults.bind(this);
    this.handleDisabledEditorClick = this.handleDisabledEditorClick.bind(this);
    this.handleDocumentKey = this.handleDocumentKey.bind(this);
    this.onTestResultsHide = this.onTestResultsHide.bind(this);
    this.onTestResultsShow = this.onTestResultsShow.bind(this);
    this.onTestCode = this.onTestCode.bind(this);
    this.onUpdatedFieldValue = this.onUpdatedFieldValue.bind(this);

    window.ace.config.setModuleUrl("ace/mode/python", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-python.min.js")

    this.editor = null;                   // The editor element
    this.editor_cursor_position = null;   // The working editor cursor position
    this.editor_selection_range = null;   // The working editor selection range
    this.editing_return_field = false;    // Flag used to indicate we're editing a return field
    this.was_edited = false;              // Flag used to indicate that the code was edited
    this.code_check = null;               // Used to manage requests to check code
    this.change_during_code_check = false;// Flag indicating a change was detected while we were checking the code
    this.skip_code_checks = true;         // Used to signal that a checking of the code should be skipped
    this.prev_gutter_decorations = [];    // The list of previous gutter decoration lines

    // Setup default values
    let current_return_variables = {};
    current_return_variables[algo_returns[0].name] = ['channel_size'];
    current_return_variables[algo_returns[1].name] = ['pixels'];
    current_return_variables[algo_returns[2].name] = ['Channel Size'];

    this.state = {
      mode: algo_modes.main,        // The current display mode
      current_field_values: {},     // Current values for fields
      current_return_variables,     // The return variables
      test_results: null,           // The current set of test results
      code_ok: true,                // Code quality flag
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
      if (this.state.mode !== algo_modes.main) {
        this.setState({mode: algo_modes.main});
      }
    });

    // Indicate when something was changed in the editor window
    this.editor.on('change', this.checkCodeQuality);

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
   * Checks if the code changed while we were checking it and schedules another check if it did
   */
  checkCodeChangedDuringCheck() {
    if (this.change_during_code_check) {
      window.setTimeout(this.checkCodeQuality, 1);
    }
  }

  /**
   * Checks the code quality
   */
  checkCodeQuality() {
    this.was_edited = true;

    // Don't check the code if we're to skip a check
    if (this.skip_code_checks) {
      return;
    }

    // Don't check the code if we're already checking it
    if (this.code_check !== null) {
      this.change_during_code_check = true;
      return;
    }

    // Inidicate we haven't made changes yet while checking the code
    this.change_during_code_check = false;

    this.makeCodeServerCall('check', 
          'python',
          (success) => {this.handleCodeQualityResult(success); this.checkCodeChangedDuringCheck();},
          (error) => {this.checkCodeChangedDuringCheck();}
    );
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
   * Generates the UI to be used for code indicators
   */
  generateCodeIndicators() {
    const code_indicator_extra_class = this.state.code_ok ? ' algorithm-edit_code-error-indicator-ok' : ' algorithm-edit_code-error-indicator-error';
    const code_test_button_extra_class = this.state.code_ok ? '' : ' algorithm-edit_code-error-indicator-test-disabled';
    const code_test_button_click_handler = this.state.code_ok ? this.onTestCode : null;

    return (
      <div id="algorithm_edit_code_indicator_wrapper" className="algorithm-edit-code-indicator-wrapper">
        <div id="algorithm_edit_code_test_button" className={'algorithm-edit_code-error-indicator-test' + code_test_button_extra_class} onClick={code_test_button_click_handler}>Test</div>
        <div className="algorithm-edit-code-indicator-separator"></div>
        <div id="algorithm_edit_code_error_indicator" className={'algorithm-edit_code-error-indicator-button' + code_indicator_extra_class}></div>
      </div>
    );
  }

  /**
   * Generates the UI for indicating that editing is disabled
   */
  generateEditorDisabled() {

    // Set a timeout so that we can position ourselved correctly
    window.setTimeout(() => {
      let parent_el = document.getElementById('algorithm_edit_editor');
      let el = document.getElementById('algorithm_edit_editor_disable_overlay');
      if (!parent_el || !el) {
        return;
      }

      // Get the the position information
      let parent_rect = parent_el.getBoundingClientRect();

      //  Update the position
      el.style.top = parent_rect.y + 'px';
      el.style.left = parent_rect.x + 'px';
      el.style.width = parent_rect.width + 'px';
      el.style.height = parent_rect.height + 'px';
    }, 1);

    return (
      <div id="algorithm_edit_editor_disable_overlay" className="algorithm-edit-editor-disable-overlay" onClick={this.handleDisabledEditorClick}>
        <div id="algorithm_edit_editor_disable_message_wrapper" className="algorithm-edit-editor-disable-message-wrapper">
          <div id="algorithm_edit_editor_disable_message" className="algorithm-edit-editor-disable-message">
          Click here to save changes and resume editing
          </div>
        </div>
      </div>
    );
  }

  /**
   * Returns the UI for the footer
   */
  generateFooter() {
    return (
      <div id="algorithm_edit_footer" className="algorithm-edit-footer">
        {(this.state.mode !== algo_modes.test_code && this.state.test_results) && 
              <div id="algorithm_edit_display_results_wrapper" className="algorithm-edit-display-results-wrapper">
                <div id="algorithm_edit_display_results_button" className="algorithm-edit-display-results-button" onClick={this.onTestResultsShow}>
                <svg version="1.1"
                     baseProfile="full"
                     width="16" height="16"
                     xmlns="http://www.w3.org/2000/svg">
                  <line x1="6" y1="4" x2="7" y2="6" stroke="lightgreen" strokeLinecap="round" strokeWidth="2"/>
                  <line x1="7" y1="6" x2="10" y2="2" stroke="lightgreen" strokeLinecap="round" strokeWidth="2"/>
                  <polygon points="4 9 12 9 8 13 4 9" stroke="rgb(190, 190, 190)" fill="lightgrey" strokeWidth="1"/>
                </svg>
                </div>
              </div>
        }
        {(this.state.mode === algo_modes.test_code && this.state.test_results) && 
              <div id="algorithm_edit_display_results_wrapper" className="algorithm-edit-display-results-wrapper">
                <div id="algorithm_edit_display_results_button" className="algorithm-edit-display-results-button" onClick={this.onTestResultsHide}>
                <svg version="1.1"
                     baseProfile="full"
                     width="16" height="16"
                     xmlns="http://www.w3.org/2000/svg">
                  <line x1="6" y1="4" x2="7" y2="6" stroke="rgb(170, 230, 170, 0.5)" strokeLinecap="round" strokeWidth="2"/>
                  <line x1="7" y1="6" x2="10" y2="2" stroke="rgb(170, 230, 170, 0.5)" strokeLinecap="round" strokeWidth="2"/>
                  <polygon points="4 13 12 13 8 9 4 13" stroke="rgb(190, 190, 190)" fill="lightgrey" strokeWidth="1"/>
                </svg>
                </div>
              </div>
        }
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
                    <tr key={name}>
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
      <div id="return_variables_definition_wrapper" className="return-variables-definition-wrapper" key={return_item.name}>
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
   * Generates the UI for test test
   */
  generateTestResults() {
    const tr_even = 'algorithm-edit-test-results-even-row';
    const tr_odd = 'algorithm-edit-test-results-odd-row';

    return (
      <div id="algorithm_edit_test_results_wrapper" className="algorithm-edit-test-results-wrapper">
        <table id="algorithm_edit_test_results_table" className="algorithm-edit-test-results-table">
          <thead>
            <tr className="algorithm-edit-test-results-header-row">
              {this.state.test_results[0].split(',').map((item) => <td key={item} className="algorithm-edit-test-results-header-cell">{item}</td>)}
            </tr>
          </thead>
          <tbody>
            {this.state.test_results.slice(1).map((item, idx) => <tr key={'result' + idx} className={(idx & 0x01) ? tr_odd : tr_even}>
                    {item.split(',').map((value, value_idx) => <td key={'result_value' + idx + '_' +  value_idx}>{value}</td>)}</tr>)
            }
          </tbody>
        </table>
      </div>
    );
  }

  /**
   * Fetches the starting code template for the language and algorithm type
   * @param {string} lang - the programming language of the template
   * @param {int|string} algo - the algorithm type of the template
   */
  getStartingTemplate(lang, algo) {
    const uri = Utils.getHostOrigin().concat(encodeURI(`/template/${lang}/${algo}`));

    try {
      fetch(uri, {
        method: 'GET'
        }
      )
      .then(response => {if (response.ok) return response.text(); else throw response.statusText})
      .then(success => {this.skip_code_checks = true;
                        this.editor.selectAll();
                        this.editor.insert(success);
                        this.editor.moveCursorTo(6, 4);
                        this.editor.selection.selectLineEnd();
                        this.editor.focus();
                        this.skip_code_checks = false;
                      })
      .catch(error => {console.log("ERROR",error);});
    } catch (err) {
      console.log("Fetch starting template exception", err);
      throw err;
    }
  }

  /**
   * Handles the results of a code quality check by updating the editor
   * @param {Array} results - the results containing problem information
   * @param {int} results[].line - the line that has the problem
   * @param {int} results[].message - the column that has the problem
   */
  handleCodeQualityResult(results) {
    let cur_code_ok = true;

    if (this.editor.session.getAnnotations) {
      this.editor.session.clearAnnotations();
    }

    if (results.length > 0) {
      this.editor.session.setAnnotations(results.map((item) => {return ({row: parseInt(item.line) - 1, column: 0, text: item.message, type: 'warning'});}));
      cur_code_ok = false;
    }

    if (this.state.code_ok !== cur_code_ok) {
      this.setState({code_ok: cur_code_ok});
    }
  }

  /**
   * Handles the user clicking on the disabled editor window
   */
  handleDisabledEditorClick() {
    if (this.editing_return_field === true) {
      window.dispatchEvent(new KeyboardEvent('keypress', {'key':'Enter'}))
    } else {
      this.editor.focus(); 
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
   * Displays the result of a succcessful test run (does not mean the test succeeded)
   * @param {Object} success - the result returned by the server
   */
  handleTestSuccess(success) {
    if (Array.isArray(success)) {
      if (!this.editor_cursor_position) {
        this.editor_cursor_position = this.editor.getCursorPosition();
        this.editor_selection_range = this.editor.getSelectionRange();
      }

      this.setState({mode: algo_modes.test_code, test_results: success});
    }
  }

  /**
   * @callback AAlgorithmEdit~CodeSuccessCallback
   * @param {object} success - the object returned by the server
   */

  /**
   * @callback AAlgorithmEdit~CodeErrorCallback
   * @param {string} error - the error string returned by the server
   */

  /**
   * @callback AAlgorithmEdit~CodeExceptionCallback
   * @param {Object} error - the error exception object that wass thrown
   */

  /**
   * Common function for making code-related calls
   * @param {string} type - the type of code call being made: one of 'check', 'test'
   * @param {string} language - the code language that's being checked: one of 'python'
   * @param {AAlgorithmEdit~CodeSuccessCallback} success_cb - the callback function for when the call succeeds
   * @param {AAlgorithmEdit~CodeErrorCallback} error_cb - the callback function for when the server returns an error
   * @param {AAlgorithmEdit~CodeExceptionCallback} [exception_cb] - optional callback function for when an exception is thrown
   * @param {string} [method] - override default POST method with another method
   * @param {string} [uri_params] - string to append to the URI beginning with a '?' (these parameters will be encoded)
   */
  makeCodeServerCall(type, language, success_cb, error_cb, exception_cb, method, uri_params) {
    // Validate and encode the uri_params parameter
    let cur_uri_params = ''
    if (uri_params) {
      cur_uri_params += uri_params;
      if (cur_uri_params[0] !== '?') {
        console.log('Invalid URI parameter specified');
        return;
      }
      let uri_parts = cur_uri_params.substring(1).split('&');
      cur_uri_params = '?' + uri_parts.map((part) => encodeURI(part)).join('&');
    }

    // Prepare the parameters
    const code = this.editor.getValue();
    const variables = {};
    algo_fields.forEach((item) => {
      let val = '';
      if (this.state.current_field_values.hasOwnProperty(item.name)) {
        val = this.state.current_field_values[item.name];
      }
      variables[item.variable_name] = val;
    });
    algo_returns.forEach((item) => {
      let val = '';
      if (this.state.current_return_variables.hasOwnProperty(item.name)) {
        val = this.state.current_return_variables[item.name].join(',');
      }
      variables[item.variable_name] = val;
    });

    const form_data = new FormData();
    form_data.append('code', code);
    form_data.append('variables', JSON.stringify(variables));
    
    // Make the call
    const uri = Utils.getHostOrigin().concat(encodeURI(`/code/${type}/${language}`), cur_uri_params);
    try {
      this.code_check = window.setTimeout(() => {
        fetch(uri, {
          method: method ? method.toupper() : 'POST',
          body: form_data,
          credentials: 'include',
          }
        )
        .then(response => { this.code_check = null;
                            if (response.ok)
                              // Check if we've had an error on the server side indicated by non-200 status
                              if (response.status === 200) {
                                return response.json();
                              } else {
                                return []   // TODO: figure out what to do with OK but not 200 status'
                              }
                            else
                              throw response.statusText
                          })
        .then(success => {success_cb(success);})
        .catch(error => {console.log("ERROR",error); this.code_check = null;error_cb(error);});
      }, 1);
    } catch (err) {
      console.log(`Code server call (${type} ${language}) exception:`, err);
      if (exception_cb) {
        exception_cb(err);
      } else {
        throw err;
      }
    }
  }

  /**
   * Handles testing the code
   */
  onTestCode() {
    // Make sure we have no errors
    if (this.state.code_ok !== true) {
      return;
    }

    this.makeCodeServerCall('test',
            'rgb_plot/python',
            (success) => {this.handleTestSuccess(success);},
            (error) => {this.setState({test_results: null});/*TODO: Error*/}
    );
  }

  /**
   * Handles the user wanting to hide test results
   */
  onTestResultsHide() {
    if (this.state.test_results) {
      this.editor.focus()
    }
  }

  /**
   * Handles the user wanting to see test results
   */
  onTestResultsShow() {
    if (this.state.test_results) {
      if (!this.editor_cursor_position) {
        this.editor_cursor_position = this.editor.getCursorPosition();
        this.editor_selection_range = this.editor.getSelectionRange();
      }
      this.setState({mode: algo_modes.test_code});
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
          this.editor_cursor_position = null;
          this.editor.moveCursorTo(cur_cursor_pos.row, cur_cursor_pos.column);
        }
        if (this.editor_selection_range) {
          const cur_selection_range = this.editor_selection_range;
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
          {this.generateCodeIndicators()}
          <div id="algorithm_edit_editor" className="algorithm-edit-editor"></div>
        </div>
        {(this.state.mode !== algo_modes.main && this.state.mode !== algo_modes.test_code) && this.generateEditorDisabled()}
        {(this.state.mode === algo_modes.test_code && this.state.test_results) && this.generateTestResults()}
        <div id="algorithm_edit_footer" className="algorithm-edit-footer">
          {this.generateFooter()}
        </div>
      </div>
    );
  }
}

export default AAlgorithmEdit;
