// Base class for data definition and access

class IData {

  static filtering = {
    normal: 0,
    regular_expression: 1,
  };

  static auth_type = {
    UI: 'UI',
    URL: 'URL'
  };

  static auth_ui_type = {
    plain: 0,
    secret: 1,
    password: 2,
  };

  initialize() {
    return null;
  }

  authentication() {
    return null;
  }

  connect(auth_info, success_cb, failure_cb) {
    return success_cb(null);
  }

  listFolder(path, filter, success_cb, failure_cb) {
    return failure_cb("Not implemented");
  }
}

export default IData;
