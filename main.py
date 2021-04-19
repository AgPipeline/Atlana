"""Server side API"""

import json
import os
import fnmatch
import time
#from osgeo import gdal, osr
#from PIL import Image
#from flask import Flask, request, send_file, make_response, render_template
from irods.session import iRODSSession
import irods.exception
from flask import Flask, request, session
from flask_cors import CORS, cross_origin
#from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = 'this_is_not_such_100_secret'    # Replace with random string

cors = CORS(app, resources={r"/files": {"origins": "http://127.0.0.1:3000"}})

FILE_START_PATH = os.path.abspath(os.path.dirname(__file__))

def normalize_path(path: str) -> str:
    """Normalizes the path to the current OS separator character
    Arguments:
        path: the path to localize
    Return:
        Returns the localized path, which may be unchanged
    """
    if os.path.sep == '/':
        to_replace = '\\'
    else:
        to_replace = '/'

    parts = path.split(to_replace)
    if len(parts) <= 1:
        return os.path.sep.join(parts)

    # Strip out doubled up separators
    new_parts = [one_part for one_part in parts if len(parts) > 0]
    return os.path.sep.join(new_parts)


@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Headers', 'Cache-Control')
    response.headers.add('Access-Control-Allow-Headers', 'X-Requested-With')
    response.headers.add('Access-Control-Allow-Headers', 'Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
    return response

@app.route('/server/files', methods=['GET'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def files() -> tuple:
    """Handles listing folder contents
    Arguments:
        path: the relative path to list
        file_filter: the filter to apply to the returned names
    """
    return_names = []
    have_error = False

    path = request.args['path']
    file_filter = request.args['filter']

    if len(path) <= 0:
        print('Zero length path requested' % path, flush=True)
        return 'Resource not found', 404

    try:
        working_path = normalize_path(path)
        if working_path[0] == '/':
            working_path = '.'  + working_path
        cur_path = os.path.abspath(os.path.join(FILE_START_PATH, working_path))
        if not cur_path.startswith(FILE_START_PATH):
            print('Invalid path requested: "%s"' % path, flush=True)
            return 'Resource not found', 400
    except FileNotFoundError as ex:
        print("A file not found exception was caught:",  ex)
        have_error = True

    if have_error:
        return 'Resource not found', 404

    for one_file in os.listdir(cur_path):
        file_path = os.path.join(cur_path, one_file)
        if not one_file[0] == '.' and (not file_filter or (file_filter and fnmatch.fnmatch(one_file, file_filter))):
            return_names.append({'name': one_file,
                                 'path': os.path.join(path, one_file),
                                 'size': os.path.getsize(file_path),
                                 'date': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(file_path))),
                                 'type': 'folder' if os.path.isdir(file_path) else 'file'
                                 })

#    resp = make_response()
#    resp.headers['Access-Control-Allow-Credentials'] = 'true'

    return json.dumps(return_names)


@app.route('/irods/connect', methods=['POST'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def irods_connect() -> tuple:
    """Handles connecting to the iRODS server
    Returns:
        The success establishing a connection to the server
    """
    have_error = False
    host, port, zone, user, password = None, None, None, None, None

    # Get the fields from the request
    try:
        host = request.form.get('host')
        port = request.form.get('port')
        zone = request.form.get('zone')
        user = request.form.get('user')
        password = request.form.get('password')

        if not host or not port or not zone or not user or not password:
            have_error = True
    except ValueError as ex:
        print("A value exception was caught while fetching form data:", ex)
        have_error = True

    if have_error:
        print ("Missing or bad value: Host:", str(host), " Port:", str(port), " Zone:", str(zone), " User:",
               str(user), " Password:", ('***' if password else str(password)))
        return 'iRODS fields are missing or invalid', 400

    session['connection'] = {'host': host, 'port': port, 'user': user, 'password': password, 'zone': zone}

    return {'path': '/{0}/home/{1}'.format(zone, user)}


@app.route('/irods/files', methods=['GET'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def irods_files() -> tuple:
    """Handles listing folder contents
    Arguments:
        path: the relative path to list
        file_filter: the filter to apply to the returned names
    """
    return_names = []

    path = request.args['path']
    file_filter = request.args['filter']

    conn_info = session['connection']
    conn = iRODSSession(host=conn_info['host'], port=conn_info['port'], user=conn_info['user'], password=conn_info['password'], zone=conn_info['zone'])

    if len(path) <= 0:
        print('Zero length path requested' % path, flush=True)
        return 'Resource not found', 404

    try:
        col = conn.collections.get(path)
        for one_obj in col.data_objects:
            if not one_obj.name == '.' and (not file_filter or (file_filter and fnmatch.fnmatch(one_obj.name, file_filter))):
                return_names.append({'name': one_obj.name,
                                     'path': one_obj.path,
                                     'size': one_obj.size,
                                     'date': '{0:%Y-%m-%d %H:%M:%S}'.format(one_obj.modify_time),
                                     'type': 'file'
                                     })
        for one_obj in col.subcollections:
            return_names.append({'name': one_obj.name,
                                 'path': one_obj.path,
                                 'size': 0,
                                 'date': '',
                                 'type': 'folder'
                                 })
    except irods.exception.NetworkException as ex:
        print('Network exception caught for iRODS listing: ', path, ex)
        return 'Unable to complete iRODS listing request: %s' % path, 504
    except irods.exception.CAT_INVALID_AUTHENTICATION as ex:
        print('Invalid authentication exception caught for iRODS listing: ', path, ex)
        return 'Invalid password specified for iRODS listing request: %s' % path, 401
    except irods.exception.CAT_INVALID_USER as ex:
        print('Invalid user exception caught for iRODS listing: ', path, ex)
        return 'Invalid user specified for iRODS listing request: %s' % path, 401

    return json.dumps(return_names)


if __name__ == '__main__':
    app.run(debug=False)
