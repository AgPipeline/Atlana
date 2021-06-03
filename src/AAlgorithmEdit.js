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

var algo_modes = {
  main: 1,
  edit_fields: 2,
  edit_returns: 3,
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
    this.editVariables = this.editVariables.bind(this);

    window.ace.config.setModuleUrl("ace/mode/python", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-python.min.js")

    this.editor = null;

    this.state = {
      mode: algo_modes.main,        // The current display mode
      field_values: {},             // The field values
      return_variables: {},         // The return variabless
    };
  }

  /**
   * Called after the component has rendered
   */
  componentDidMount() {
    this.editor = window.ace.edit('algorithm_edit_editor', {
                                    selectionStyle: "text"
                                  });
    this.editor.session.setMode('ace/mode/python');

    // Get the template associated with the laguage and algorithm type
    this.getStartingTemplate(this.props.lang, this.props.type);
  }

  /**
   * Called when the user wants to edit the fields
   */
  editFields() {
    this.setState({mode: algo_modes.edit_fields});
  }
  
  /**
   * Called when the user wants to edit the return variables
   */
  editVariables() {
    this.setState({mode: algo_modes.edit_returns});
  }

  /**
   * Generates the entry fields for the algorithm
   */
  generateAlgorithmFieldsUI() {

    return (
        <div id="algorithm_edit_prop_wrapper" className="algorithm-edit-prop-wrapper">
          <div id="algorithm_field_edit_wrapper" className="algorithm-field-edit-wrapper">
            <div id="algorithm_field_edit_prompt" className="algorithm-field-edit-prompt"></div>
            <div className="algorithm-field-edit-spacer"></div>
            <div id="algorithm_field_edit_button" className="algorithm-field-edit-button" onClick={this.editFields}>Edit</div>
          </div>
          {algo_fields.map((item) => 
                            <div id="algorithm_field_wrapper" className="algorithm-field-wrapper" key={item.name}>
                              <div id={'algorithm_field_' + item.name} className="algorithm-field-prompt">{item.prompt}&nbsp;=&nbsp;</div>
                              <div id={'algorithm_field_' + item.name + '_value'} className="algorithm-field-value"></div>
                            </div>
                          )
          }
        </div>
      );
  }

  generateReturnVariablesUI() {
    return (
      <div id="return_variables_wrapper" className="return-variables-wrapper">
        <div id="return_variables_prompt_wrapper" className="return-variables-prompt-wrapper">
          <div id="return_variables_prompt" className="return-variables-prompt">Return variables</div>
          <div className="return-variables-spacer"></div>
          <div id="return_variables_edit_button" className="return-variables-edit-button" onClick={this.editVariables}>Edit</div>
        </div>
        <div id="return_variables_definition_wrapper" className="return-variables-definition-wrapper">
          <div id="return_variables_definition_names" className="return-variables-definition-prompt return-variables-definition-names">VARIABLE_NAMES=</div>
          <div id="return_variables_definition_names_value" className="return-variables-definition-value return-variables-definition-names-value">channel_size</div>
        </div>
        <div id="return_variables_definition_wrapper" className="return-variables-definition-wrapper">
          <div id="return_variables_definition_units" className="return-variables-definition-prompt return-variables-definition-units">VARIABLE_UNITS=</div>
          <div id="return_variables_definition_units_value" className="return-variables-definition-value return-variables-definition-units-value">pixels</div>
        </div>
        <div id="return_variables_definition_wrapper" className="return-variables-definition-wrapper">
          <div id="return_variables_definition_labels" className="return-variables-definition-prompt return-variables-definition-labels">VARIABLE_LABELS=</div>
          <div id="return_variables_definition_labels_value" className="return-variables-definition-value return-variables-definition-labels-value">Channel Size</div>
        </div>
      </div>
    );
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
   * Returns the algorithm editing UI
   */
  render() {
    return(
      <div id="algorithm_edit_wrapper" className="algorithm-edit-wrapper">
        <div id="algorithm_edit_variables_wrapper" className="algorithm-edit-variables-wrapper">
          {this.generateAlgorithmFieldsUI()}
          {this.generateReturnVariablesUI()}
        </div>
        <div id="algorithm_edit_edit_wrapper" className="algorithm-edit-edit-wrapper">
          <div id="algorithm_edit_editor" className="algorithm-edit-editor">Loading template ...</div>
        </div>
        {this.state.mode === algo_modes.edit_fields && null}
        {this.state.mode === algo_modes.edit_returns && null}
      </div>
    );
  }
}

export default AAlgorithmEdit;
