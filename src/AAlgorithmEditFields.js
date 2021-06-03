/**
 * @fileoverview Algorithm editing of fields interface
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';

/**
 * Class for editing algorithm fields
 * @extends Component
 */
class AAlgorithmEditFields extends Component {

  /**
   * Initializes the class instance
   * @param {Object} props - the instance's properties
   */
  constructor(props) {
    super(props);

    this.onCancel = this.onCancel.bind(this);
  }

  /**
   * Called when the user wants to cancel editing the fields
   * @param {Object} ev - the triggering event
   */
  onCancel(ev) {
    this.props.onCancel();
  }

  /**
   * Returns the UI for editing fields
   */
  render() {
    return (
      <div id="algorithm_edit_fields_background" className="algorithm-edit-fields-background">
        <div id="algorithm_edit_fields_wrapper" className="algorithm-edit-fields-wrapper">
          <div id="algorithm_edit_fields_titlebar" className="algorithm-edit-fields-titlebar">
            <div id="algorithm_edit_fields_titlebar_left" className="algorithm-edit-fields-titlebar-left"></div>
            <div id="algorithm_edit_fields_titlebar_center" className="algorithm-edit-fields-titlebar-center">Edit Algorithm Fields</div>
            <div id="algorithm_edit_fields_titlebar_right" className="algorithm-edit-fields-titlebar-right">
              <div id="algorithm_edit_fields_titlebar_cancel" className="algorithm-edit-fields-titlebar-close" onClick={this.onCancel} >x</div>
            </div>
          </div>
          <div id="algorithm_edit_fields_edit_wrapper" id="algorithm-edit-fields-edit-wrapper">
          
          </div>
          <div name="algorithm_edit_fields_footer" className="algorithm-edit-fields-footer">
            <div name="algorithm_edit_fields_ok" className="algorithm-edit-fields-button algorithm-edit-fields-ok" onClick={this.onOk}>OK</div>
            <div name="algorithm_edit_fields_spacer" className="algorithm-edit-fields-footer-spacer"></div>
            <div name="algorithm_edit_fields_cancel" className="algorithm-edit-fields-button algorithm-edit-fields-cancel" onClick={this.onCancel}>Cancel</div>
          </div>
        </div>
      </div>
    );
  }
}

export defaul AAlgorithmEditFields;