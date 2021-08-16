/**
 * @fileoverview Algorithm development interface
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import AAlgorithmEdit from './AAlgorithmEdit.js';
import AAlgorithmTypes from './AAlgorithmTypes.js';
import WorkspaceTitlebar from './WorkspaceTitlebar.js';
import Message from './Message.js';
import './AAlgorithm.css';

var algorithm_titles = [
  'Name',
  'Type',
  'URL',
  'ID',
  ' ',
  ' ',
];

/**
 * Implements the UI for running algorithms
 * @extends Component
 */
class AAlgorithm extends Component {

  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.dismissMessage = this.dismissMessage.bind(this);
    this.displayError = this.displayError.bind(this);
    this.generateTitleRightUI = this.generateTitleRightUI.bind(this);
    this.onBack = this.onBack.bind(this);
    this.updateNewType = this.updateNewType.bind(this);

    this.new_algorithm_id = null;   // The ID of the new algorithm the user has selected

    this.state = {
      algorithm_list: [],       // The known algorithms (code)
      editing_type: null,       // Set to the active type of algorithm being edited
      editing_list_idx: null,   // The index of the item being edited, when editing an existing algorithm
      errors: null,             // Error messsages
      display_title: null,      // The title to display in the title bar (null will display the default)
    };
  }

  /**
   * Algorithm names for display
   */
  algorithm_names = [{
    type: AAlgorithmTypes.rgb_plot,
    name: 'Plot-level RGB algorithm',
    id: 'plot_level_rgb',
    template_name: 'rgb_plot.py',
  }];

  /**
   * Called when the user wants to add a new algorithm
   */
  addItem() {
    // If there isn't a workflow type selected, set the focus to that control
    if (this.new_algorithm_id == null) {
      let el = document.getElementById('algorithm_types');
      el.focus();
      return;
    }

    const found_algorithm = this.algorithm_names.find((item) => item.type === this.new_algorithm_id);

    // Display the editor
    this.setState({
      editing_type: this.new_algorithm_id,
      display_title: 'New ' + found_algorithm.name,
    });
  }

  /**
   * Called to dismiss a displayed message
   * @param {Object} ev - the triggering event
   */
  dismissMessage(ev) {
    this.setState({errors: null});
  }

  /**
   * Used to display popup messages
   * @param {string} msg - the message to display
   */
  displayError(msg) {
    this.setState({errors: msg});
  }

  /**
   * Generates the UI for the main working space
   */
  generateAlgorithmUI() {
    // List the algorithms if we aren't editing
    if (this.state.editing_type === null) {
      return (
        <table id="algorithm_table" className="algorithm-table">
          <thead className="algorithm-table-titles">
            <tr>
              {algorithm_titles.map(this.getTitle)}
            </tr>
          </thead>
          <tbody>
            {this.state.algorithm_list.map((item) => {
              return (
                <tr id={'algorithm_detail_row_' + item.id} key={item.id} className="algorithm-detail-row">
                  <td id={'algorithm_detail_name_' + item.id} className="algorithm-detail-item algorithm-detail-name">{item.name}</td>
                  <td id={'algorithm_detail_type_' + item.id} className="algorithm-detail-item algorithm-detail-type">{item.type}</td>
                  <td id={'algorithm_detail_url_' + item.id} className="algorithm-detail-item algorithm-detail-url">{item.url}</td>
                  <td id={'algorithm_detail_id_' + item.id} className="algorithm-detail-item algorithm-detail-id">{item.id}</td>
                  <td id={'algorithm_detail_edit_' + item.id} className="algorithm-detail-item algorithm-detail-edit" onClick={(ev) => this.onEditAlgorithm(ev, item.id)}>Edit</td>
                  <td id={'algorithm_detail_remove_' + item.id} className="algorithm-detail-item algorithm-detail-remove" onClick={(ev) => this.onRemoveItem(ev, item.id)}>Remove</td>
                </tr>
              ); 
            })}
          </tbody>
        </table>
      );
    }

    const algo_info = this.algorithm_names.find((item) => item.type === this.state.editing_type);
    return (
      <AAlgorithmEdit lang="python" type={algo_info.template_name} />
    );
  }

  /**
   * Generates the right side of the title bar UI when editing
   */
  generateEditTitleRightUI() {
    return (
      <div id="algorithm_prop_item_wrapper" className="algorithm-prop-item-wrapper">
        <div id="algorithm_prop_item_language_prompt" className="algorithm-prop-item-prompt algorithm-prop-item-language-prompt">Language:</div>
        <div id="algorithm_prop_item_language" className="algorithm-prop-item algorithm-prop-item-language">Python</div>
      </div>
    );
  }

  /**
   * Generates the right side of the title bar UI
   */
  generateTitleRightUI() {
    return (
      <>
        <div id="algorithm_types_list_wrapper" className="algorithm-types-list-wrapper">
          <select name="algorithm_types" id="algorithm_types" onChange={this.updateNewType}>
            <option value="" className="algorithm-types-option algorithm-type-option-item">--Please select--</option>
            {this.algorithm_names.map((item, idx) => {return (
                <option value={item.id} key={item.id} className="algorithm-types-option algorithm-type-option-item">{item.name}</option>
              );}
            )}
          </select>
        </div>
        <div id="algorithm_add_new_button_wrapper" className="algorithm-add-new-button-wrapper">
          <span id="add_new_button" className="algorithm-add-new-button" onClick={this.addItem}>New</span>
        </div>
      </>
    );
  }

  /**
   * Returns the title UI of the display columns for showing known workflows
   * @param {Object} title - the title string to display
   * @param {int|string} idx - the index associated with the title_string
   */
  getTitle(title, idx) {
    if (title && (title.length > 0) && (title[0] !== '_')) {
      if (title !== ' ') {
        return (<th id={"title_" + idx} key={title} className="algorithm-title-text">{title}</th>);
      } else {
        return (<th id={"title_" + idx} key={title + '_' + idx}></th>);
      }
    }
    return null;
  }

  /**
   * Called to navigate to previous page
   * @param {Object} ev - the triggering event
   */
  onBack(ev) {
    if (this.state.editing_type === null) {
      this.props.onDone(ev);
    } else {
      this.setState({editing_type: null,
                     display_title: null
                   });
    }
  }

  /**
   * Called when the user selects a new algorithm type
   * @param {Object} ev - the triggering event
   */
  updateNewType(ev) {
    const target_val = ev.target.value;

    if (!target_val || (target_val.length <= 0)) {
      this.new_algorithm_id = null;
      return;
    }

    let found_idx = this.algorithm_names.findIndex((item) => item.id === target_val);
    this.new_algorithm_id = found_idx >= 0 ? this.algorithm_names[found_idx].type : null;
  }

  /**
   * Render the UI
   */
  render() {
    const are_editing = this.state.editing_type !== null;
    const title_string = are_editing && this.state.display_title ? this.state.display_title : 'Manage Algorithms';
    const title_right_generator = are_editing ? this.generateEditTitleRightUI : this.generateTitleRightUI;
    const have_errors = this.state.errors !== null;

    return (
      <>
        {have_errors && <Message msg={this.state.errors} type={Message.type.warning} ok={this.dismissMessage} cancel={this.dismissMessage} />}
        <div id="algorithm_wrapper" className="algorithm-wrapper">
          <WorkspaceTitlebar title={title_string} back={this.onBack} extra={title_right_generator} />
          {this.generateAlgorithmUI()}
        </div>
      </>
    );
  }  
}

export default AAlgorithm;