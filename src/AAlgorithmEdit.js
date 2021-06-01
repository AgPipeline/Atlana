/**
 * @fileoverview Algorithm editing interface
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import Utils from './Utils.js';
import './AAlgorithmEdit.css';

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

    window.ace.config.setModuleUrl("ace/mode/python", "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/mode-python.min.js")

    // Get the template associated with the laguage and algorithm type
    this.getStartingTemplate(props.lang, props.type);

    this.editor = null;
  }

  /**
   * Called after the component has rendered
   */
  componentDidMount() {
    this.editor = window.ace.edit('algorithm_edit_editor', {
                                    selectionStyle: "text"
                                  });
    this.editor.session.setMode('ace/mode/python');
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
      .then(success => {this.editor.selectAll();this.editor.insert(success)})
      .catch(error => {console.log("ERROR",error);});
    } catch (err) {
      console.log("Fetch starting template exception", err);
      throw err;
    }
  } 

  render() {
    return(
      <div id="algorithm_edit_wrapper" className="algorithm-edit-wrapper">
        <div id="algorithm_edit_props_wrapper" className="algorithm-edit-props-wrapper">
          <div id="algorithm_edit_prop_author_wrapper" className="algorithm-edit-prop-item-wrapper">
            <div id="algorithm_edit_prop_item_author_prompt" className="algorithm-edit-prop-item-prompt algorithm-edit-prop-item-author-prompt">Author:</div>
            <div id="algorithm_edit_prop_item_author" className="algorithm-edit-prop-item algorithm-edit-prop-item-author">Myself</div>
          </div>
        </div>
        <div id="algorithm_edit_edit_wrapper" className="algorithm-edit-edit-wrapper">
          <div id="algorithm_edit_editor" className="algorithm-edit-editor">Loading template ...</div>
        </div>
      </div>
    );
  }
}

export default AAlgorithmEdit;
