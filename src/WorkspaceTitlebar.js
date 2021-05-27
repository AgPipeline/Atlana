/**
 * @fileoverview Implementation of titlebar for workspace area UIs
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { Component } from 'react';
import './WorkspaceTitlebar.css'

/**
 * Renders the title bars of workspace components
 * @extends Component
 */
class WorkspaceTitlebar extends Component {
  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.onGoBack = this.onGoBack.bind(this);

    this.title = ((props.title !== undefined) && (props.title !== null)) ? props.title : '&nbsp;';
    this.custom_cb = ((props.extra !== undefined) && (props.extra !== null)) ? props.extra : null;
    this.back_cb = ((props.back !== undefined) && (props.back !== null)) ? props.back : null;

    this.state = {
      refresh_count: 0,       // Something to force a refresh
    }
  }

  /**
   * Called when the conponent is updated
   * @param {Object} prev_props - the previous set of object properties
   */
  componentDidUpdate(prev_props) {
    const cur_title = ((this.props.title !== undefined) && (this.props.title !== null)) ? this.props.title : '&nbsp;';
    const cur_custom_cb = ((this.props.extra !== undefined) && (this.props.extra !== null)) ? this.props.extra : null;
    const cur_back_cb = ((this.props.back !== undefined) && (this.props.back !== null)) ? this.props.back : null;

    if ((cur_title !== this.title) || (cur_custom_cb !== this.custom_cb) || (cur_back_cb !== this.back_cb)) {
      this.title = cur_title;
      this.custom_cb = cur_custom_cb;
      this.back_cb = cur_back_cb;

      this.setState({refresh_count: this.state.refresh_count + 1});
    }
  }

  /**
   * Handles the back button on the title bar by calling the props callback function
   */
  onGoBack() {
    if (this.back_cb) {
      this.back_cb();
    }
  }

  /**
   * Renders the title bar
   */
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
