// Implementation of titlebar for workspace are implementations
import { Component } from 'react';
import './WorkspaceTitlebar.css'

class WorkspaceTitlebar extends Component {

  constructor(props) {
    super(props);

    this.onGoBack = this.onGoBack.bind(this);

    this.title = (props.hasOwnProperty('title') && (props['title'] !== null)) ? props['title'] : '&nbsp;';
    this.custom_cb = (props.hasOwnProperty('extra') && (props['extra'] !== null)) ? props['extra'] : null;
    this.back_cb = (props.hasOwnProperty('back') && (props['back'] !== null)) ? props['back'] : null;
  }

  onGoBack() {
    if (this.back_cb) {
      this.back_cb();
    }
  }

  render() {
    return (
      <div id="wt_header" className="wt-header">
        <div id="wt_header_back" className="wt-header-back" onClick={this.onGoBack}>&lt;-&nbsp;back</div>
        <div id="wt_header_text" className="wt-header-text">{this.title}</div>
        <div className="wt-header-fill">&nbsp;</div>
        <div id="wt_customize_wrapper" className="wt-customize-wrapper">
          {this.custom_cb && this.custom_cb()}
        </div>
      </div>
    );
  }
}

export default WorkspaceTitlebar;
