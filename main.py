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
from typing import Union
from irods.session import iRODSSession
from irods.data_object import chunks
import irods.exception
from flask import Flask, request, session
from flask_cors import CORS, cross_origin

from workflow_definitions import WORKFLOW_DEFINTIONS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'this_is_not_such_100_secret'    # Replace with random string

cors = CORS(app, resources={r"/files": {"origins": "http://127.0.0.1:3000"}})

# Starting point for seaching for files on server
FILE_START_PATH = os.path.abspath(os.path.dirname(__file__))

# Status codes for checking on processes
STATUS_NOT_STARTED = 0
STATUS_RUNNNG = 1
STATUS_FINISHED = 2

# Number of tries to download from iRODS before giving up
IRODS_DOWNLOAD_RETRIES = 2

# Number of times to try to access queue status; should not exceed delays defined in FILE_PROCESS_QUEUE_STATUS_TIMEOUTS
FILE_PROCESS_QUEUE_STATUS_RETRIES = 3

# Number of times to try to access queue status; should not exceed delays defined in FILE_PROCESS_QUEUE_MESSAGE_TIMEOUTS
FILE_PROCESS_QUEUE_MESSAGES_RETRIES = 3

# Delay times to access the queue status before giving up
FILE_PROCESS_QUEUE_STATUS_TIMEOUTS = [0.1, 0.2, 0.4, 0.7]

# Delay times to a access the queue messages before giving up
FILE_PROCESS_QUEUE_MESSAGE_TIMEOUTS = [0.1, 0.2, 0.1, 0.2, 0.4]


def _clean_for_json(dirty: object) -> dict:
    """Cleans the dictionary of non-JSON compatible elements
    Arguments:
        dirty: the dictionary to clean
    Return:
        Returns a copy of the dictionary that has been cleaned
    """
    if isinstance(dirty, dict):
        cleaned =  {}
        for key, item in dirty.items():
            # We don't want callable objects to be returned
            print("-> ",key,callable(item),item)
            if not callable(item):
                print("  handling",type(item))
                cleaned[key] = _clean_for_json(item)

        return cleaned

    if isinstance(dirty, list):
        return [_clean_for_json(el) for el in dirty if not callable(el)]
    if isinstance(dirty, tuple):
        return (_clean_for_json(el) for el in dirty if not callable(el))
    if isinstance(dirty, set):
        return set((_clean_for_json(el) for el in dirty if not callable(el)))

    return dirty


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

def get_queue_path(working_folder: str) -> str:
    """ Gets the path to the working queue
    Arguments:
        working_folder: path to the working folder
    Return:
        Returns the path to the queue
    """
    return os.path.join(working_folder, 'queue')


def queue_start(workflow_id: str, working_folder: str, recover: bool) -> dict:
    """ Handles starting queueing a set of processes
    Arguments:
        workflow_id: the  workflow ID
        working_folder: string representing the working folder
        recover: flag indicating this is an attempt to restart a workflow
    Return:
        Returns information on this process as a dictionary
    """
    print("Begin queueing workflow", workflow_id)

    cleanup = False
    queue_path = get_queue_path(working_folder)
    if recover is True:
        # Make sure we have something to recover
        if not os.path.isfile(queue_path):
            msg = "ERROR: Attempting to recover a missing workflow %s" % (working_folder)
            print (msg)
            raise RuntimeError("ERROR: Attempting to recover a missing workflow %s" % (working_folder))
        # TODO: Signal recover
    else:
        # Check if  our queue is valid and restart it if not
        starting_queue = True
        if os.path.isfile(queue_path):
            try:
                with open(queue_path, 'r') as in_file:
                    res = json.load(in_file)
                    if isinstance(res, list):
                        starting_queue = False
            except Exception:
                pass

            if starting_queue:
                os.unlink(starting_queue)
                # TODO: Signal cleanup
                cleanup = True

        # Begin the starting queue
        with open(queue_path, 'w') as out_file:
            json.dump([], out_file)

    return {'recover': recover, 'cleanup': cleanup}


def queue_one_process(workflow_id: str, cur_command: dict, working_folder: str, process_info: dict):
    """Handles queueing one command
    Arguments:
        workflow_id: the  workflow ID
        cur_command: the command to queue
        working_folder: string representing the working folder
        process_info: dictionary returned by starting process call
    """
    print("Current command ", cur_command['step'], " with working folder '", cur_command['working_folder'], "'", cur_command)

    print("    Checking for files")
    for one_parameter in cur_command['parameters']:
        print("    ", one_parameter)
        # Skip over special cases
        if 'visibility' in one_parameter and one_parameter['visibility'] == 'server':
            continue

        # Handle downloading files
        if one_parameter['type'] == 'file':
            dest_path = os.path.join(cur_command['working_folder'], os.path.basename(one_parameter['value']))
            print("Downloading file '", one_parameter['value'], "' to '", dest_path, "'")
            one_parameter['getFile'](one_parameter['auth'], one_parameter['value'], dest_path)
            one_parameter['value'] = dest_path

    print("Run workflow step", workflow_id, cur_command['step'], cur_command['command'])
    queue_path = get_queue_path(working_folder)

    if 'recover' in process_info and process_info['recover'] is True:
        # TODO: Signal recover
        return

    with open(queue_path, 'r') as in_file:
        current_workflow = json.load(in_file)

    print("Appending command to workflow: ", current_workflow)
    current_workflow.append(_clean_for_json(cur_command))

    print("Current workflow: ", current_workflow)
    with open(queue_path, 'w') as out_file:
        json.dump(current_workflow, out_file, indent=2)


def queue_finish(workflow_id: str, working_folder: str, process_info: dict):
    """Finishes queueing workflow processes
    Arguments:
        workflow_id: the  workflow ID
        working_folder: string representing the working folder
        process_info: dictionary returned by starting process call
    """
    # pylint: disable=unused-argument
    print("Finished queueing", workflow_id)


def queue_status(workflow_id: str, working_folder: str) -> Union[dict, str, None]:
    """Reurns the status of the workflow
    Arguments:
        workflow_id: the ID of the current workflow
        working_folder: the working folder for the workflow
    Return:
        Returns None if the workflow isn't started, an empty status if it's running but has no status yet,
        the current status, or a string indicating the completion status. A generic status is
        returned if the real status can't be obtained
    """
    print("Checking queue status", workflow_id, working_folder)
    status_path = os.path.join(working_folder, 'status.json')
    if not os.path.exists(status_path):
        return None

    cur_status = None
    caught_exception = False
    for one_attempt in range(0, FILE_PROCESS_QUEUE_STATUS_RETRIES):
        caught_exception = True
        try:
            with open(status_path, 'r') as in_file:
                try:
                    cur_status = json.load(in_file)
                    caught_exception = False
                except json.JSONDecodeError as ex:
                    print("A JSON decode error was caught while loading status information", ex)
                except Exception as ex:
                    print("An unknown exception was caught while checking workflow status", ex)
        except OSError as ex:
            msg = 'An OS exception was caught while trying to open status file "%s"' % status_path
            print(msg, ex)
        except Exception as ex:
            msg = 'Unknown exception caught while trying to access the status file "%s"' % status_path
            print(msg, ex)

        if cur_status is None:
            print("Sleeping before trying to get status again")
            time.sleep(FILE_PROCESS_QUEUE_STATUS_TIMEOUTS[one_attempt])
        else:
            break

    if cur_status and 'completion' in cur_status:
        cur_status = cur_status['completion']

    return cur_status if not caught_exception else {'status': 'Pending...'}


def queue_messages(workflow_id: str, working_folder: str) -> tuple:
    """Reurns the messages of the workflow
    Arguments:
        workflow_id: the ID of the current workflow
        working_folder: the working folder for the workflow
    Return:
        A 2-tuple of: normal messages and error messages as separate lists. None is returned if the messages can't be loaded
    """
    messages, errors = None, None
    print("Checking queue messages", workflow_id, working_folder)

    cur_path = os.path.join(working_folder, 'messages.txt')
    if os.path.exists(cur_path):
        for one_attempt in range(0, FILE_PROCESS_QUEUE_STATUS_RETRIES):
            try:
                with open(cur_path, 'r') as in_file:
                    messages = in_file.readlines()
            except OSError as ex:
                msg = 'An OS exception was caught while trying to read output file "%s"' % cur_path
                print(msg, ex)
            except Exception as ex:
                msg = 'An unknown exception was caught while trying to read output file "%s"' % cur_path
                print(msg, ex)

            if messages is None:
                msg = 'Sleeping %d before trying to get messages again "%s"' % (one_attempt, cur_path)
                print(msg)
                time.sleep(FILE_PROCESS_QUEUE_MESSAGE_TIMEOUTS[one_attempt])
            else:
                break

    cur_path = os.path.join(working_folder, 'errors.txt')
    if os.path.exists(cur_path):
        for one_attempt in range(0, FILE_PROCESS_QUEUE_STATUS_RETRIES):
            try:
                with open(cur_path, 'r') as in_file:
                    errors = in_file.readlines()
            except OSError as ex:
                msg = 'An OS exception was caught while trying to read error file "%s"' % cur_path
                print(msg, ex)
            except Exception as ex:
                msg = 'An unknown exception was caught while trying to read error file "%s"' % cur_path
                print(msg, ex)

            if errors is None:
                msg = 'Sleeping %d before trying to get errors again "%s"' % (one_attempt, cur_path)
                print(msg)
                time.sleep(FILE_PROCESS_QUEUE_MESSAGE_TIMEOUTS[one_attempt])
            else:
                break

    return messages, errors


def workflow_start(workflow_id: str, workflow_template: dict, data: list, file_handlers: list, working_folder: str, recover: bool=False):
    """Starts a workflow
    Arguments:
        workflow_id: the ID of the current workflow
        workflow_template: the template of the workflow to run
        data: the data used by the template for processing
        file_handlers: the list of known file handlers
        working_folder: the working folder for the workflow
        recover: flag to indicate we're trying to recover a workflow that had a problem
    """
    # pylint: disable=too-many-nested-blocks
    workflow = []

    for one_step in workflow_template['steps']:
        cur_command = one_step['command']
        parameters = []
        if 'fields' in one_step:
            for one_field in one_step['fields']:
                # Find the data associated with this field
                cur_parameter = {}
                if 'visibility' in one_field and one_field['visibility'] == 'server':
                    print("SERVER SIDE", one_field)
                    cur_parameter = {'command': cur_command, 'field_name': one_field['name'], 'type': one_field['type'],
                                     'prev_command_path': one_field['prev_command_path'], 'visibility': one_field['visibility']}
                else:
                    for one_data in data:
                        if 'command' in one_data and one_data['command'] == cur_command and one_data['field_name'] == one_field['name']:
                            print("WORKING ON", one_data, one_field)
                            if 'data_type' in one_data:
                                if one_data['data_type'] in file_handlers:
                                    cur_parameter = {**one_data, **(file_handlers[one_data['data_type']])}
                                    cur_parameter['type'] = one_field['type']
                                    break
                            else:
                                cur_parameter = {'field_name': one_data['field_name'], 'value': one_data[one_data['field_name']],
                                                 'type': one_field['type']}
                                print("   ", cur_parameter)
                                break


                if cur_parameter:
                    parameters.append(cur_parameter)
                else:
                    if not 'mandatory' in one_field or one_field ['mandatory']:
                        print("Unable to find parameter for step ", one_step['name'], ' field ', one_field['name'])
                        raise RuntimeError("Missing mandatory value for %s on workflow step %s" % (one_field['name'], one_step['name']))

        workflow.append({'step': one_step['name'], 'command': one_step['command'], 'parameters': parameters,
                         'working_folder': working_folder})

    process_info = queue_start(workflow_id, working_folder, recover)
    print("FINAL WORKFLOW: ",workflow)
    for one_process in workflow:
        queue_one_process(workflow_id, one_process, working_folder, process_info)
    queue_finish(workflow_id, working_folder, process_info)


def workflow_status(workflow_id: str, working_folder: str) -> dict:
    """Returns the status of the workflow
    Arguments:
        workflow_id: the ID of the current workflow
        working_folder: the working folder for the workflow
    Return:
        Returns a dict containing a status ID and the status returned by the workflow query
    """
    print("Checking workflow status", workflow_id, working_folder)
    cur_status = queue_status(workflow_id, working_folder)
    if cur_status is None:
        return {'result': STATUS_NOT_STARTED}

    print("STATUS:", cur_status['message'], cur_status['message'] == 'Completed')
    if isinstance(cur_status, dict) and not cur_status['message'] == 'Completed':
        return {'result': STATUS_RUNNNG, 'status': cur_status}

    return {'result': STATUS_FINISHED, 'status': str(cur_status)}


def workflow_messages(workflow_id: str, working_folder: str) -> dict:
    """Returns the messages from the workflow
    Arguments:
        workflow_id: the ID of the current workflow
        working_folder: the working folder for the workflow
    Return:
        Returns a dict containing any normal and error messages from the workflow query
    """
    print("Checking workflow messages", workflow_id, working_folder)

    messages, errors = queue_messages(workflow_id, working_folder)

    return {'messages': messages if messages is not None else [],
            'errors': errors if errors is not None else []}


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
def handle_files() -> tuple:
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
def handle_irods_connect() -> tuple:
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
def handle_irods_files() -> tuple:
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
def handle_workflow_start() -> tuple:
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

    workflow_start(workflow_id, cur_workflow, workflow_data['params'], FILE_HANDLERS, working_dir)

    # Keep workflow IDs in longer term storage
    print("START", session['workflows']);
    if 'workflows' not in session or session['workflows'] is None:
        session['workflows'] = [workflow_id,]
    else:
        cur_workflows = session['workflows']
        print("START 2", cur_workflows)
        cur_workflows.append(workflow_id)
        print("START 3", cur_workflows)
        session['workflows'] = cur_workflows
    print("START 4", session['workflows'], type(session['workflows']));

    return json.dumps({'id': workflow_id})


@app.route('/workflow/status/<string:workflow_id>', methods=['GET'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def handle_workflow_status(workflow_id: str) -> tuple:
    """Rreturns the status of a workflow
    Arguments:
        workflow_id: the id of the workflow to query
    """
    print("Workflow status", workflow_id)
    cur_workflows = session['workflows']
    if not cur_workflows or workflow_id not in cur_workflows:
        msg = "ERROR: attempt made to access invalid workflow %s" % workflow_id
        print(msg)
        return msg, 400     # Bad request

    working_dir = os.path.join(tempfile.gettempdir(), 'atlana', workflow_id)
    if not os.path.isdir(working_dir):
        msg = "ERROR: requested workflow no longer exists"
        print(msg)
        return msg, 404     # Not found

    return json.dumps(workflow_status(workflow_id, working_dir))


@app.route('/workflow/messages/<string:workflow_id>', methods=['GET'])
#@cross_origin()
@cross_origin(origin='127.0.0.1:3000', headers=['Content-Type','Authorization'])
def get_workflow_messages(workflow_id: str) -> tuple:
    """Rreturns the messages from the workflow
    Arguments:
        workflow_id: the id of the workflow to query
    """
    print("Workflow messges", workflow_id)
    cur_workflows = session['workflows']
    if not cur_workflows or workflow_id not in cur_workflows:
        msg = "ERROR: attempt made to access invalid workflow %s" % workflow_id
        print(msg)
        return msg, 400     # Bad request

    working_dir = os.path.join(tempfile.gettempdir(), 'atlana', workflow_id)
    if not os.path.isdir(working_dir):
        msg = "ERROR: requested workflow no longer exists"
        print(msg)
        return msg, 404     # Not found

    return json.dumps(workflow_messages(workflow_id, working_dir))


if __name__ == '__main__':
    app.run(debug=False)
