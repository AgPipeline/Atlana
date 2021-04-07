//Implementation of file system interface
import { Component } from 'react';
import './AFilesEdit.css';

class AFilesEdit extends Component {
  constructor(props) {
    super(props);

    this.onCancel = this.onCancel.bind(this);
  }

  onCancel() {
    this.props.cancel(this.props.source);
  }

  render() {
    return (
      <div id="file_edit_wrapper" className="file-edit-wrapper">
        <div id="file_edit_titlebar" className="file-edit-titlebar">
          <div id="file_edit_titlebar_left" className="file-edit-titlebar-left"></div>
          <div id="file_edit_titlebar_center" className="file-edit-titlebar-center">{this.props.title}</div>
          <div id="file_edit_titlebar_right" className="file-edit-titlebar-right">
            <div id="file-edit-titlebar-cancel" className="file-edit-titlebar-close" onClick={this.onCancel} >x</div>
          </div>
        </div>
      </div>
    );
  }
}

export default AFilesEdit;