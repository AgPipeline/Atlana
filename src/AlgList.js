import React, { Component } from 'react';
import "./AlgList.css"

var algPlot = [
{
  name: 'Sum Pixels',
  id: '1',
  data_type: 'rgb',
  code: 'import os'
}
];

var algFile = [
{
  name: 'remove ground',
  id: '33',
  data_type: 'lidar',
  code: 'import PDAL'
}
];

var algTitles = [
  'Name',
  'ID',
  'Data type',
  ' ',
  '_add_button',
];

class AlgList extends Component {
  constructor(props) {
    super(props);

    this.algs = this.props.type === 'plot' ? algPlot : algFile;
    this.algTitle = this.props.type === 'plot' ? "Plot Algorithms" : "File Algorithms";

    this.addItem = this.addItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.editItem = this.editItem.bind(this);
    this.getTitle = this.getTitle.bind(this);

    this.state = {
    };
  }

  addItem(ev) {
    console.log("Add Item");
    if (this.props.hasOwnProperty('onEdit')) {
      this.props['onEdit']('new');
    } else {
      console.log("ERROR: No onEdit callback available");
    }
  }

  editItem(ev, id) {
    console.log("Edit:", id);
    if (this.props.hasOwnProperty('onEdit')) {
      this.props['onEdit'](id);
    } else {
      console.log("ERROR: No onEdit callback available");
    }
  }

  deleteItem(ev, id) {
    console.log("Delete:", id);
  }

  getTitle(item, idx) {
    if (item && (item.length > 0) && (item[0] !== '_')) {
      return (<th id={"title_" + idx} key={item} className="alg-title">{item}</th>);
    }
    if (item === '_add_button') {
      return (<th id="add_new" key="_add" className="alg-title"><span id="add_new_button" className="add-new-button" onClick={this.addItem}>New</span></th>);
    }
  }

  render() {
    return (
      <div id="algs_wrapper" className="alg-wrapper">
        <span id="algs_title" className="algs-title">{this.algTitle}</span>
        <table id="algs_table" className="alg-table">
          <thead className="alg-titles-row">
           {algTitles.map(this.getTitle)}
          </thead>
          <tbody>
            {this.algs.map((item) => {
              return (
                <tr id={"alg_detail_row_" + item.id} className="alg-detail-row">
                  <td id={"alg_detail_name_" + item.id} className="alg-detail-item alg-detail-name">{item.name}</td>
                  <td id={"alg_detail_id_" + item.id} className="alg-detail-item alg-detail-id">{item.id}</td>
                  <td id={"alg_detail_type_" + item.id} className="alg-detail-item alg-detail-type">{item.data_type}</td>
                  <td id={"alg-detail_edit_" + item.id} className="alg-detail-item alg-detail-edit" onClick={(ev) => this.editItem(ev, item.id)}>Edit</td>
                  <td id={"alg-detail_del_" + item.id} className="alg-detail-item alg-detail-delete" onClick={(ev) => this.deleteItem(ev, item.id)}>Delete</td>
                </tr>
              ); 
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

export default AlgList
