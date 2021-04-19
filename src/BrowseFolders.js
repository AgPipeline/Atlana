// Browsing folders UI
import { Component } from 'react';
import './BrowseFolders.css';

class BrowseFolders extends Component {
  constructor(props) {
    super(props);

    this.generateFolderSelection = this.generateFolderSelection.bind(this);
    this.generateNoFoldersUI = this.generateNoFoldersUI.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onFolderChange = this.onFolderChange.bind(this);
  }

  generateFolderSelection()
  {
    if (this.props.folders.length <= 0) {
      return (null);
    }

    return (
      <select id="browse_folder_selector" className="browse-folder-selector" onChange={this.onFolderChange}>
        {this.props.folders.map((item, idx) => {
          return (
            <option id={'browse_folder_' + item.name} key={item.name + '_' + idx} className="browse-folder-option">{item.name}</option>
          );
        })}
      </select>
    );
  }

  generateNoFoldersUI() {
    return (
      <div id="browse_folder_no_folders_wrapper" className="browse-folder-no-folder-wrapper">
        <div id="browse_folder_no_folders" className="browse-folder-no-folder">
          No folders are specified
        </div>
      </div>
    );
  }

  onCancel() {
    this.props.cancel();
  }

  onFolderChange(ev) {
  }

  onOk() {

  }

  render() {
    const missing_data = this.props.folders.length <= 0;
    const ok_button_disabled = missing_data;
    const ok_button_classes = 'browse-folder-button workflow-edit-ok ' + (ok_button_disabled ? 
                                            'browse-folder-button-disabled browse-folder-ok-disabled' : '');

    return (
      <div id="browse_folder_background" className="browse-folder-background">
        <div className="browse-folder-edit-spacing"></div>
        <div id="browse_folder_wrapper" className="browse-folder-wrapper">
          <div id="browse_folder_titlebar" className="browse-folder-titlebar">
            <div id="browse_folder_titlebar_left" className="browse-folder-titlebar-left"></div>
            <div id="browse_folder_titlebar_center" className="browse-folder-titlebar-center">{this.props.title}</div>
            <div id="browse_folder_titlebar_right" className="browse-folder-titlebar-right">
              <div id="browse_folder_titlebar_cancel" className="browse-folder-titlebar-close" onClick={this.onCancel} >x</div>
            </div>
          </div>
          <div id="browse_folder_folders_wrapper" className="browse-folder-folders-wrapper">
            {this.props.folders.length > 0 && this.generateFolderSelection()}
            {this.props.folders.length <= 0 && this.generateNoFoldersUI()}
          </div>
          <div name="browse_folder_footer" className="browse-folder-footer">
            <div name="browse_folder_ok" className={ok_button_classes} onClick={missing_data ? null : this.onOk}>OK</div>
            <div name="browse_folder_spacer" className="browse-folder-footer-spacer"></div>
            <div name="browse_folder_cancel" className="browse-folder-button browse-folder-cancel" onClick={this.onCancel}>Cancel</div>
          </div>
        </div>
        <div className="browse-folder-edit-spacing"></div>
      </div>
    );
  }
}

export default BrowseFolders;