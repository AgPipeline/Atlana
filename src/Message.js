//Implementation of message display
import { Component } from 'react';
import './Message.css';

var message_title = ['Error', 'Warning', 'Information'];
var button_text = ['Done', 'Cancel', 'Ignore'];

class Message extends Component {
  constructor(props) {
    super(props);

    this.generateButtons = this.generateButtons.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onIgnore = this.onIgnore.bind(this);
    this.onOk = this.onOk.bind(this);

    const cur_type = this.props.hasOwnProperty('type') ? this.props['type'] : Message.type.information;
    const cur_msg = (this.props.hasOwnProperty('msg') && this.props['msg']) ? this.props['msg'] : '<missing message>';
    const cur_buttons = this.props.hasOwnProperty('buttons') ? parseInt(this.props['buttons']) : Message.buttons.one;
    const ok_override = (this.props.hasOwnProperty('ok_text') && this.props['ok_text']) ? this.props['ok_text'] : null;
    const cancel_override = (this.props.hasOwnProperty('cancel_text') && this.props['cancel_text']) ? this.props['cancel_text'] : null;
    const ignore_override = (this.props.hasOwnProperty('ignore_text') && this.props['ignore_text']) ? this.props['ignore_text'] : null;

    this.state = {
      type: cur_type,           // Overall style of message
      msg: cur_msg,             // The message
      buttons: cur_buttons,     // The number of buttons to offer
      ok_override,              // The override text for the OK buttton
      cancel_override,          // The override text for the Cancel (second) buttton
      ignore_override,          // The override text for the Ignore (third) button
    };
  }

  static type = {
    error: 0,
    warning: 1,
    information: 2,
  };

  static buttons = {
    one: 1,     // OK button
    two: 2,     // OK-Cancel button
    three: 3,   // Ok-Ignore-Cancel button
  };

  // TODO: add a timeout to close the window
  componentWillUnmount() {
  }

  generateButtons() {
    return (
      <>
        {Message.buttons <= 1 && <div className="message-window-button-speparator"></div>}
        <div id="message_window_button_ok" className="message-window-button message-window-button-ok " onClick={this.onOk}>
          {this.state.ok_override ? this.state.ok_override : button_text[0]}
        </div>
        {Message.buttons <= 1 && <div className="message-window-button-speparator"></div>}
        {Message.buttons > 2 && 
          <>
            <div className="message-window-button-speparator"></div>
            <div id="message_window_button_ignore" className="message-window-button message-window-button-ignore " onClick={this.onIgnore}>
              {this.state.ignore_override ? this.state.ignore_override : button_text[2]}
            </div>
          </>
        }
        {Message.buttons > 1 && 
          <>
            <div className="message-window-button-speparator"></div>
            <div id="message_window_button_cancel" className="message-window-button message-window-button-cancel " onClick={this.onClose}>
              {this.state.cancel_override ? this.state.cancel_override : button_text[1]}
            </div>
          </>
        }
      </>
    );
  }

  onClose() {
    console.log("CLOSE");
    if (this.props.hasOwnProperty('cancel')) {
      this.props['cancel'](this.props['id']);
    }
  }

  onIgnore() {
    console.log("IGNORE");
    if (this.props.hasOwnProperty('ignore')) {
      this.props['ignore'](this.props['id']);
    }
  }

  onOk(){
    console.log("OK");
    if (this.props.hasOwnProperty('ok')) {
      this.props['ok'](this.props['id']);
    }
  }

  render() {
    let window_type_style = '';
    let close_button_style = '';
    switch (this.state.type) {
      default:
      case Message.type.error:
        window_type_style += 'message-window-error ';
        close_button_style += 'message-window-title-close-error ';
        break;

      case Message.type.warning:
        window_type_style += 'message-window-warning ';
        close_button_style += 'message-window-title-close-warning ';
        break;

      case Message.type.information:
        window_type_style += 'message-window-information ';
        close_button_style += 'message-window-title-close-information ';
        break;
    }

    return (
      <div id="message_window" className="message-window">
        <div className="message-window-spacing"></div>
        <div id="message_window_body" className={'message-window-body ' + window_type_style}>
          <div id="message_window_title_wrapper" className="message-window-title-wrapper">
            <div id="message_window_title_left" className="message-window-title-left">
              <div id="message_window_title_text" className="message-window-title-text">{message_title[this.state.type]}</div>
            </div>
            <div id="message_window_title_middle" className="message-window-title-middle"></div>
            <div id="message_window_title_right" className="message-window-title-right">
              <div id="message_window_title_close" className={'message-window-title-close ' + close_button_style} onClick={this.onClose}>X</div>
            </div>
          </div>
          <div id="message_window_message_wrapper" className="message-window-message-wrapper">
            <div id="message_window_message" className="message-window-message">{this.state.msg}</div>
          </div>
          <div id="message_window_buttons_wrapper" className="message-window-buttons-wrapper">
            {this.generateButtons()}
          </div>
        </div>
        <div className="message-window-spacing"></div>
      </div>
    );
  }
}

export default Message;
