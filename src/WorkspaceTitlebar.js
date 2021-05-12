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

    this.state = {
      refresh_count: 0,       // Something to force a refresh
    }
  }

  componentDidUpdate(prev_props) {
    console.log("Workspace titlebar");
    const cur_title = (this.props.hasOwnProperty('title') && (this.props['title'] !== null)) ? this.props['title'] : '&nbsp;';
    const cur_custom_cb = (this.props.hasOwnProperty('extra') && (this.props['extra'] !== null)) ? this.props['extra'] : null;
    const cur_back_cb = (this.props.hasOwnProperty('back') && (this.props['back'] !== null)) ? this.props['back'] : null;

    if ((cur_title !== this.title) || (cur_custom_cb !== this.custom_cb) || (cur_back_cb !== this.back_cb)) {
      this.title = cur_title;
      this.custom_cb = cur_custom_cb;
      this.back_cb = cur_back_cb;

      this.setState({refresh_count: this.state.refresh_count + 1});
    }
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
