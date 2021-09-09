/**
 * @fileoverview Passcode entry form
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import {Component} from 'react';
import './PasscodeEntry.css';

/**
 * Implements the UI for entering passcodes
 * @extends Component
 */
class PasscodeEntry extends Component {

  /**
   * Initializes class instance
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.onCancel = this.onCancel.bind(this);
    this.onChangePasscode = this.onChangePasscode.bind(this);
    this.onOk = this.onOk.bind(this);

    this.state = {
      passcode: '',           // The current passcode
    };
  }

  /**
   * Handles the user cancelling folder browsing
   */
  onCancel() {
    this.props.cancel();
  }

  /**
   * Handles the user updating the passcode
   * @param {Object} ev - the triggering event
   */
  onChangePasscode(ev) {
    const cur_passcode = ev.target.value;
    if (cur_passcode !== this.state.passcode) {
      this.setState({passcode: cur_passcode});
    }
  }

  /**
   * Called when the user wants to save their configuration
   */
  onOk() {
    this.props.passcode(this.state.passcode);
  }

  /**
   * Returns the UI for deefining remote server access
   */
  render() {
    const missing_data = this.state.passcode.length <= 0;
    const ok_button_disabled = missing_data ? true :false;
    const ok_button_classes = 'passcode-button passcode-ok ' + (ok_button_disabled ? 
                                            'passcode-button-disabled passcode-ok-disabled' : '');

    return (
      <div id="passcode_background" className="passcode-background">
        <div className="passcode-spacing"></div>
        <div id="passcode_wrapper" className="passcode-wrapper">
          <div id="passcode_titlebar" className="passcode-titlebar">
            <div id="passcode_titlebar_left" className="passcode-titlebar-left"></div>
            <div id="passcode_titlebar_center" className="passcode-titlebar-center">{this.props.title}</div>
            <div id="passcode_titlebar_right" className="passcode-titlebar-right">
              <div id="passcode_titlebar_cancel" className="passcode-titlebar-close" onClick={this.onCancel} >x</div>
            </div>
          </div>
          <div id="passcode_entry_wrapper" className="passcode-entry-wrapper">
            <div id="passcode_item_wrapper" className="passcode-item-wrapper" >
              <div id="passcode_value_prompt" className="passcode-item passcode-value-prompt">Password</div>
              <input id="password_value" type="password" className="password-item password-value" defaultValue={this.state.passcode} onChange={this.onChangePasscode}>
              </input>
            </div>
          </div>
          <div name="passcode_footer" className="passcode-footer">
            <div name="passcode_ok" className={ok_button_classes} onClick={ok_button_disabled ? null : this.onOk}>OK</div>
            <div name="passcode_spacer" className="passcode-footer-spacer"></div>
            <div name="passcode_cancel" className="passcode-button passcode-cancel" onClick={this.onCancel}>Cancel</div>
          </div>
        </div>
        <div className="passcode-spacing"></div>
      </div>
    );
  }
}

export default PasscodeEntry;