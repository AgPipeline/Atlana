import { Component } from 'react';
import AlgList from './AlgList';
import './App.css';

var workflows=[
{
  name: 'Soilmask to Canopycover',
  id: 'soilmask-canopycover',
  parts: [
      {id: "soilmask"},
      {id: "plotclip"},
      {id: "file_discovery", options: {filename: "orthomosaic_mask.tif"}},
      {id: "canopycover"},
      {id: "combine_csv"},
      ]
}, {
  name: 'Soilmask by ratio to canopy cover',
  id: 'soilmask-ratio-canopycover',
  parts: [
      {id: "soilmask_ratio"},
      {id: "plotclip"},
      {id: "file_discovery", options: {filename: "orthomosaic_mask.tif"}},
      {id: "canopycover"},
      {id: "combine_csv"},
      ]
}
];

var menu = [
{ 
  name: 'New workflow',
  id: 'new_workflow_step',
}, {
  name: 'File Algorithm',
  id: 'file_step',
}, {
  name: 'Plot Algorithm',
  id: 'plot_step',
}, {
  name: 'File stores',
  id: 'stores_step'
}
];

class App extends Component {
  constructor(props) {
    super(props);

    this.editFileAlg = this.editFileAlg.bind(this);
    this.editPlotAlg = this.editPlotAlg.bind(this);

    this.state = {
      workflow: null,
      user_step: null,
      edit: null,
    };
  }

  editFileAlg(id) {
    this.setState({workflow: null, user_step: null, edit: {id, type: 'file'}});
  }

  editPlotAlg(id) {
    this.setState({workflow: null, user_step: null, edit: {id, type: 'plot'}});
  }

  render() {
    return (
      <div className="app">
        <header className="app-header">
          <span id="app-header-wrapper" className="app-header-wrapper">
            {menu.map((item) => {
              return(<span id={item.id}
                           className="app-header-item" 
                           onClick={() => {this.setState({workflow: null, user_step: item.id, edit: null});}}
                     >{item.name}</span>);})}
          </span>
        </header>
        <span id="app_name" className="app-title-text">Atlana</span>
        <span id="app_body" className="body-wrapper">
          <span id="app_workflows" className="workflow-list-wrapper">
            {workflows.map((item) => {
              return (<span key={item.id} id={"workflow" + item.id}
                                          className="workflow_list_item" 
                                          onClick={() => {this.setState({workflow: item.id, user_step: null, edit: null});}} 
                      >{item.name}</span>);
              })
            }
          </span>
          <span id="workspace_area" className="workspace-area">
           {this.state.user_step === 'file_step' && <AlgList type="file" onEdit={this.editFileAlg} />}
           {this.state.user_step === 'plot_step' && <AlgList type="plot" onEdit={this.editPlotAlg} />}
          </span>
        </span>
      </div>
    );
  }
}

export default App;
