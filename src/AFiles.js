// Files UI implementation
import { Component } from 'react';
import FileInterfaces from './FileInterfaces'
import AFilesEdit from './AFilesEdit'
import './AFiles.css';

// Configured files
var files_list = [
];

// Table header names
var files_titles = [
  'Name',
  'Type',
  'Location',
  'ID',
  ' ',
];

class AFiles extends Component {
  constructor(props) {
    super(props);

    this.addItem = this.addItem.bind(this);
    this.cancelEdit = this.cancelEdit.bind(this);
    this.deleteitem = this.deleteItem.bind(this);
    this.editItem = this.editItem.bind(this);
    this.finishEdit = this.finishEdit.bind(this);
    this.getTitle = this.getTitle.bind(this);
    this.updateNewType = this.updateNewType.bind(this);

    this.state = {
      mode: null,
      mode_name: '',
      mode_title: '',
    }
  }

  new_type_id = null;

  addItem(ev) {
    if (!this.new_type_id) {
      let el = document.getElementById('files_types');
      el.focus();
      return;
    }
    console.log("Add " + this.new_type_id);
    const cur_mode = this.new_type_id;
    let cur_mode_name = FileInterfaces.find(item => ('' + item.id === '' + cur_mode));
    if (cur_mode_name) {
      cur_mode_name = cur_mode_name.prompt;
    } else {
      cur_mode_name = '';
    }
    this.setState({mode: cur_mode, mode_name: cur_mode_name, mode_title: 'New ' +  cur_mode_name});
  }

  cancelEdit(edit_id) {
    if ('' + this.state.mode === '' + edit_id) {
      this.setState({mode: null, mode_name: '', mode_title: ''});
    }
  }

  deleteItem(ev, item_id) {
  }

  editItem(ev, item_id) {
  }

  finishEdit(edit_id) {
    if (this.state.mode === edit_id) {
      this.setState({mode: null});
    }
  }

  getTitle(item, idx) {
    if (item && (item.length > 0) && (item[0] !== '_')) {
      return (<th id={"title_" + idx} key={item} className="files-title-text">{item}</th>);
    }
    return null;
  }

  updateNewType(ev) {
    this.new_type_id = ev.target.value;
  }

  render()  {
    return (
      <>
        <div id="files_wrapper" className="files-wrapper">
          <div id="files_header" className="files-header">
            <div id="files_header_text" className="files-header-text">
              Connect to files stored in a heirarchy
            </div>
            <div className="files-header-fill">&nbsp;</div>
            <div id="files_types_add_new_wrapper" className="files-types-add-new-wrapper">
              <div id="files_types_list_wrapper" className="files-types-list-wrapper">
                <select name="files_types" id="files_types" onChange={this.updateNewType}>
                  <option value="" className="files-types-option files-type-option-select">--Please select--</option>
                  {FileInterfaces.map((item) => {return (<option value={item.id} key={item.id} className="files-types-options files-types-option-item">{item.name}</option>);}
                  )}
                </select>
              </div>
              <div id="files_add_new_button_wrapper" className="files-add-new-button-wrapper">
                <span id="add_new_button" className="files-add-new-button" onClick={this.addItem}>New</span>
              </div>
            </div>
          </div>
          <table id="files_table" className="files-table">
            <thead className="files-table-titles">
              <tr>
                {files_titles.map(this.getTitle)}
              </tr>
            </thead>
            <tbody>
              {files_list.map((item) => {
                return (
                  <tr id={'files_detail_row_' + item.id} key={item.id} className="files-detail-row">
                    <td id={'files_detail_name_' + item.id} className="files-detail-item files-detail-name">{item.name}</td>
                    <td id={'files_detail_type_' + item.id} className="files-detail-item files-detail-type">{item.data_type}</td>
                    <td id={'files_detail_type_' + item.id} className="files-detail-item files-detail-location">{item.location}</td>
                    <td id={'files_detail_id_' + item.id} className="files-detail-item files-detail-id">{item.id}</td>
                    <td id={'files-detail_edit_' + item.id} className="files-detail-item files-detail-edit" onClick={(ev) => this.editItem(ev, item.id)}>Edit</td>
                    <td id={'files-detail_del_' + item.id} className="files-detail-item files-detail-delete" onClick={(ev) => this.deleteItem(ev, item.id)}>Delete</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
        {this.state.mode !== null && <AFilesEdit title={this.state.mode_title} source={this.state.mode} name={this.state.mode_name} cancel={this.cancelEdit} submit={this.finishEdit} />}
      </>
      );
  }
}

export default AFiles;
