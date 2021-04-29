"""Server side API"""

import json
import os
import fnmatch
import time
from shutil import copyfile
import hashlib
import base64
import uuid
import tempfile
from irods.session import iRODSSession
from irods.data_object import chunks
import irods.exception
from flask import Flask, request, session
from flask_cors import CORS, cross_origin

from workflow_definitions import WORKFLOW_DEFINTIONS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'this_is_not_such_100_secret'    # Replace with random string

cors = CORS(app, resources={r"/files": {"origins": "http://127.0.0.1:3000"}})

FILE_START_PATH = os.path.abspath(os.path.dirname(__file__))

IRODS_DOWNLOAD_RETRIES = 2


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


def copy_server_file(auth: dict, source_path: str, dest_path: str) -> bool:
    """Copies the server side file to the specified location
    Arguments:
        auth: authorization information
        source_path: path to the file to copy
        dest_path: path to copy the file to
    Exceptions:
        RuntimeError is raised if the path to copy from is not in the correct top folder
    """
    # pylint: disable=unused-argument
    working_path = normalize_path(source_path)
    if working_path[0] == '/':
        working_path = '.'  + working_path
    cur_path = os.path.abspath(os.path.join(FILE_START_PATH, working_path))
    if not cur_path.startswith(FILE_START_PATH):
        raise RuntimeError("Invalid source path for server side copy:", cur_path)

    copyfile (cur_path, dest_path)
    return True


def irods_sha256_checksum(file_path: str, block_size: int=65536) -> str:
    """Calculates the iRODS checksum (hexdigest) for files
    Arguments:
        file_path: the path to the file to calculate the checksum for
        block_size: the size of the blocks to read in
    Return:
        The checksum value as a string
    """
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as in_file:
        for chunk in chunks(in_file, block_size):
            sha256.update(chunk)
    return base64.b64encode(sha256.digest()).decode()


def irod_md5_checksum(file_path: str) -> str:
    """Calcualtes the IRODS MD5 checksum for a file
    Arguments:
        file_path: the path of the file to calculate the checksum  for
    Return:
        The checksum as a string
    """
    return hashlib.md5(open(file_path, 'rb').read()).hexdigest()


def get_irods_file(auth: dict, source_path: str, dest_path: str) -> bool:
    """Fetches the iRODS file to the specified location on the local Machine
    Arguments:
        auth: authorization information
        source_path: path to the file to pull down
        dest_path: path to the destination file
    """
    have_success = False

    for cur_try in range(0, IRODS_DOWNLOAD_RETRIES):
        with iRODSSession(host=auth['host'], port=auth['port'], user=auth['user'], password=auth['password'], zone=auth['zone']) as conn:
            obj = conn.data_objects.get(source_path, dest_path)
            # Check the checksums
            # TODO: determine which checksum method the server uses (depending upon file size it may be faster to try both methods?)
            local_checksum = irod_md5_checksum(dest_path)
            if local_checksum == obj.checksum:
                have_success = True
                break

            print ("IRODS: attempt", (cur_try + 1), "Bad checksum on downloaded file:", source_path)

    return have_success


def put_irods_file(auth: dict, source_path: str, dest_path: str) -> bool:
    """Uploads the file to iRODS
    Arguments:
        auth: authorization information
        source_path: path to the source file
        dest_path: path to upload the file to
    """
    raise RuntimeError("iRODS put is not implemented")


FILE_HANDLERS = {
    '1': {
        'name': 'Server-side',
        'getFile': copy_server_file,
        'putFile': copy_server_file,
    },
    '2': {
        'name': 'iRODS',
        'getFile': get_irods_file,
        'putFile': put_irods_file,
    }
}


def run_one_process(cur_command: dict):
    """Handles running one command
    Arguments:
        cur_command: the command to run
    """
    print("Starting command ", cur_command['step'], " with working folder '", cur_command['working_folder'], "'")

    print("    Checking for files")
    for one_parameter in cur_command['parameters']:
        print("    ", one_parameter)
        if one_parameter['type'] == 'file':
            dest_path = os.path.join(cur_command['working_folder'], os.path.basename(one_parameter['value']))
            print("Downloading file '", one_parameter['value'], "' to '", dest_path, "'")
            one_parameter['getFile'](one_parameter['auth'], one_parameter['value'], dest_path)

    print("Run workflow step",  cur_command['step'], cur_command['command'])


def start_workflow(workflow_template: dict, data: list, file_handlers: list, working_folder: str):
    """Starts a workflow
    Arguments:
        workflow_template: the template of the workflow to run
        data: the data used by the template for processing
        file_handlers: the list of known file handlers
    """
    workflow = []

    for one_step in workflow_template['steps']:
        cur_command = one_step['command']
        parameters = []
        if 'fields' in one_step:
            for one_field in one_step['fields']:
                # Find the data associated with this field
                cur_parameter = {}
                for one_data in data:
                    if 'command' in one_data and one_data['command'] == cur_command and one_data['field_name'] == one_field['name']:
                        print("WORKING ON", one_data, one_field)
                        if 'data_type' in one_data:
                            if one_data['data_type'] in file_handlers:
                                cur_parameter = {**one_data, **(file_handlers[one_data['data_type']])}
                                cur_parameter['type'] = one_field['type']
                                break
                        else:
                            cur_parameter = {'field_name': one_data['field_name'], 'value': one_data[one_data['field_name']], 'type': one_field['type']}
                            print("   ", cur_parameter)
                            break

                if cur_parameter:
                    parameters.append(cur_parameter)
                else:
                    if not 'mandatory' in one_field or one_field ['mandatory']:
                        print("Unable to find parameter for step ", one_step['name'], ' field ', one_field['name'])
                        raise RuntimeError("Missing mandatory value for %s on workflow step %s" % (one_field['name'], one_step['name']))

        workflow.append({'step': one_step['name'], 'command': one_step['command'], 'parameters': parameters, 'working_folder': working_folder})

    for one_process in workflow:
        run_one_process(one_process)


@app.after_request
def add_cors_headers(response):
    """Appends CORS headers to a response
    Arguments:
        response: the response to append headers to
    Notes:
        Called automatically due to app.after_request decoration
    """
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
    Request args:
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

    return json.dumps(return_names)


@app.route('/irods/connect', methods=['POST'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def irods_connect() -> tuple:
    """Handles connecting to the iRODS server
    Request args:
        host: the CyVerse host to access
        port: the port associated with the host
        zone: the zone of the user account
        user: the user name associated with the account
        password: the password of the account
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

        if None in [host, port, zone, user, password]:
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
    Request args:
        path: the relative path to list
        file_filter: the filter to apply to the returned names
    """
    return_names = []

    path = request.args['path']
    file_filter = request.args['filter']

    conn_info = session['connection']
    conn = iRODSSession(host=conn_info['host'], port=conn_info['port'], user=conn_info['user'],
                        password=conn_info['password'], zone=conn_info['zone'])

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


@app.route('/workflow/start', methods=['POST'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def workflow_start() -> tuple:
    """Handles starting a workflow
    Request body:
        config: the workflow configuration to run
    """
    cur_workflow = None

    workflow_data = request.get_json(force=True)
    print("Workflow data:", workflow_data)

    # Find the workflow
    for one_workflow in WORKFLOW_DEFINTIONS:
        if one_workflow['id'] == workflow_data['id']:
            cur_workflow = one_workflow
            break
    if cur_workflow is None:
        msg = "Unable to find workflow associated with workflow ID %s" % (str(workflow_data['id']))
        print(msg)
        return msg, 400     # Bad request

    # Start the process of getting the files
    workflow_id = uuid.uuid4().hex
    working_dir = os.path.join(tempfile.gettempdir(), 'atlana', workflow_id)
    os.makedirs(working_dir, exist_ok=True)
    print('Workflow ID and folder', workflow_id, working_dir)

    start_workflow(cur_workflow, workflow_data['params'], FILE_HANDLERS, working_dir)

    return json.dumps({'id': workflow_id})


@app.route('/workflow/status/<string:status_id>', methods=['GET'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def workflow_status(status_id: str) -> tuple:
    """Rreturns the status of a workflow
    Arguments:
        status_id: the id of the workflow to query
    """
    print("Workflow status", status_id)


if __name__ == '__main__':
    app.run(debug=False)
