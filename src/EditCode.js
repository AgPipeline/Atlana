import React, { Component } from 'react';
import "./EditCode.css"

var langs = [
  {id: 'python', name: 'python 3.7+'},
  {id: 'R', name: 'R'},
];

var code = 'import os\nimport numpy as np\nimport droneprocessing\n\ndef entrypoint(pixels: np.ndarray) -> int:\n\nreturn pxiels.shape[1] * pxiels.shape[2]';

class EditCode extends Component {
  constructor(props) {
    super(props);

    this.editTitle = this.props.name === 'new' ? "New " + this.props.type : "Edit " + this.props.id;

    this.getLangItem = this.getLangItem.bind(this);

    this.editor = null;

    const start_lang = this.props.hasOwnProperty('lang') && this.props['lang'] ? this.props.lang : langs[0].id;
    this.state = {
      lang: start_lang,
    }
  }

  componentDidMount() {
    this.editor = window.ace.edit("editarea");
//    this.editor.setTheme("/ace/theme/clouds");
//    this.editor.session.setMode("/ace/mode/python");
  }

  getLangItem(item) {
    const selected = this.state.lang && this.state.lang === item.id;
    if (selected) {
      return(<option value={item.id} key={item.id}>{item.name}</option>);
    } else {
      return(<option value={item.id} key={item.id} >{item.name}</option>);
    }
  }

  render() {
    return (
      <div id="edit_wrapper" className="edit-wrapper">
        <div id="edit_title" className="edit-title">{this.editTitle}</div>
        <div name="field_wrapper" className="edit-field-wrapper">
          <div name="field_edit_item" className="field-edit-item">
            <label className="field-name-label">Name
              <input id="field_name" type="text" className="field-name-edit" />
            </label>
          </div>
          <div name="field_edit_item" className="field-edit-item">
            <label className="field-language-label">Language
              <select id="field_language" className="field-language-choice" defaultValue={this.state.lang} >
                {langs.map(this.getLangItem)}
              </select>
            </label>
          </div>
          <div name="field_edit_item" className="field-edit-item">
            <span id="save_edit" className="save-edit">Save</span>
          </div>
        </div>
        <div id="editor_wrapper" className="editor-wrapper">
          <div id="editarea" className="edit-area">{code}</div>
        </div>
      </div>
      );
  }
}

export default EditCode;
