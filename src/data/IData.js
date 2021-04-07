// Base class for data definition and access

class IData {

  filtering = {
    normal: 0,
    'normal': 0,
    regular_expression: 1,
    'regular expression': 1,
  };

  auth_type = {
    UI: 'UI',
    URL: 'URL'
  };

  auth_ui_type = {
    plain: 0,
    'plain': 0,
    secret: 1,
    'secret': 1,
    password: 2,
    'password': 2,
  };

  initialize() {
    return null;
  }

  authentication() {
    return null;
  }

  connect(auth_info, success_cb, failure_cb) {
    success_cb(null);
    return null;
  }

  listFolder(path, filter, success_cb, failure_cb) {
    return null;
  }
}

export default IData;
