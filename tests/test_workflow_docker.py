"""Tests running docker workflows"""

import json
import os
import pytest
import shutil
import subprocess
import tempfile
from threading import Event, Thread
import time
from typing import Union
from collections.abc import Callable

# Path to the testing workflow file and its associated parameter file
WORKFLOW_JSON_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data/test_workflow.json'))
WORKFLOW_PARAMS_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data/test_workflow_params.json'))
WORKFLOW_QUEUE_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data/test_workflow_queue.json'))

# File path for a bad JSON file
BAD_JSON_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data/test_bad_json.json'))

# Queue step that has parameters to search for
FIND_PARAMETERS_STEP_INDEX = 0
# Parameters to search for
FIND_PARAMETERS_FIELDS = ('image', 'options')
# Mandatory parameters to have found ('image' is mandatory)
FIND_PARAMETERS_MANDATORY_INDEXES = (0,)

# The script to run when testing the consumption of output from a proc
CONSUME_OUTPUT_TEST_SCRIPT = os.path.realpath(os.path.join(os.getcwd(), 'tests/generate_output.sh'))

# Command JSON write path
COMMAND_JSON_WRITE_PATH = os.path.realpath(os.getcwd())

# Run command arguments file path
COMMAND_RUN_ARGUMENTS_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data/test_workflow_run_args.json'))
COMMAND_RUN_COMMAND = 'shp2geojson'

# Path to single JSON result file
JSON_RESULT_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data/result1'))
JSON_RESULT_RECURSE_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data/'))

# Path to the repoint JSON test file
REPOINT_JSON_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data/test_found_files.json'))
REPOINT_JSON_SOURCE_FOLDER = '/input/plotclip'
REPOINT_JSON_TARGET_FOLDER = '/changed_folder'
REPOINT_JSON_WORKING_FOLDER = os.path.realpath(os.getcwd())

# Used by the output tests
OUTPUT_LINES = []
def _helper_msg_func(lines: tuple, append: bool=True) -> bool:
    """Utility function that receives the messages consumed by the test
    Arguments:
        filename: the path to the file to write lines to
        lines: a tuple of the lines to write (assumed to be a tuple of strings)
        append: append the lines to the end of the file when True. Overwrite an existing file, or create a new one when False
    Return:
        Returns True
    """
    global OUTPUT_LINES

    if not append:
        OUTPUT_LINES = []

    OUTPUT_LINES.extend(lines)
    return True


def test_get_command_map():
    """Tests the command map to ensure it is correctly populated"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    cmd_map = wd.get_command_map()
    for _, val in cmd_map.items():
        assert callable(val)


def test_load_json_file():
    """Tests loading a JSON file"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    res = wd._load_json_file(WORKFLOW_JSON_FILE)
    assert res is not None

# Variable used to capture and check error messages
ERROR_MESSAGES = None

def test_load_json_file_errors():
    """Tests errors while loading a JSON file"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    global ERROR_MESSAGES

    def error_callback(messages: tuple) -> None:
        """Error callback
        Arguments:
            messages - a tuple of messages
        """
        global ERROR_MESSAGES
        ERROR_MESSAGES = messages

    # Make the call with a file that's not JSON
    ERROR_MESSAGES = None
    res = wd._load_json_file(BAD_JSON_FILE, error_callback)
    assert res is None
    assert ERROR_MESSAGES is not None
    assert len(ERROR_MESSAGES)== 2
    assert ERROR_MESSAGES[0].startswith('A JSON decode error')

    # Make the call with an invalid file name
    ERROR_MESSAGES = None
    res = wd._load_json_file(os.path.join(os.path.dirname(BAD_JSON_FILE), 'this_is_an_invalid_file_name_that_fails'), error_callback)
    assert res is None
    assert ERROR_MESSAGES is not None
    assert len(ERROR_MESSAGES)== 2
    assert ERROR_MESSAGES[0].startswith('An unknown exception')


def test_find_parameter_values():
    """Tests the ability to find parameters"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the parameters file
    with open(WORKFLOW_QUEUE_FILE, 'r', encoding='utf8') as in_file:
        queue = json.load(in_file)
    assert queue is not None
    assert isinstance(queue, list)
    assert len(queue) > FIND_PARAMETERS_STEP_INDEX

    # Make the call
    cur_step = queue[FIND_PARAMETERS_STEP_INDEX]
    found = wd._find_parameter_values(cur_step['parameters'], FIND_PARAMETERS_FIELDS)

    # Check that mandatory parameters have values
    for idx, value in enumerate(found):
        if idx in FIND_PARAMETERS_MANDATORY_INDEXES:
            assert value is not None


def test_replace_folder_path():
    """Tests the replacement of folder path strings"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    source_folder = '/a/b/c'
    source_file = 'cucumber.plant'
    source_path = os.path.join(source_folder, source_file)
    dest_path = '/x/y/z'

    # Test without trailing folder separators
    res = wd._replace_folder_path(source_path, source_folder, dest_path)
    assert res == os.path.join(dest_path, source_file)

    # Test with trailing folder separators
    res = wd._replace_folder_path(source_path, source_folder + '/', dest_path +  '/')
    assert res == os.path.join(dest_path, source_file)

    # Test with partial folders (and only destination path having a trailing separator)
    temp_folder = os.path.dirname(source_folder)
    res = wd._replace_folder_path(source_path, temp_folder, dest_path +  '/')
    assert res == os.path.join(dest_path, os.path.basename(source_folder), source_file)

    # Test replacing multiple folders with only one (and only source folder with trailing separator)
    temp_folder = '/z'
    res = wd._replace_folder_path(source_path, source_folder + '/', temp_folder)
    assert res == os.path.join(temp_folder, source_file)


def test_replace_folder_path_error():
    """Tests the replacement of folder path strings using invalid values"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    source_folder = '/a/b/c'
    invalid_folder = '/a/b'
    source_file = 'cucumber.plant'
    test_path = os.path.join(invalid_folder, source_file)
    dest_path = '/x/y/z'

    # Test where source_folder matches the first part of test_path, but isn't a folder match
    # Source path /a/b/c shouldn't match /a/b/cucumber
    res = wd._replace_folder_path(test_path, source_folder, dest_path)
    assert res is None

    # Test where the source folder to replace doesn't match the source path
    res = wd._replace_folder_path(test_path, dest_path, dest_path)
    assert res is None


def test_consume_output():
    """Test consuming the output from a running process"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd
    global OUTPUT_LINES

    def run_consume_test(num_lines: Union[int, str], msg_func: Callable) -> None:
        """Runs the test
        Arguments:
            num_lines - the number of lines to generate
            msg-func - the message handler function
        """
        test_event = Event()
        test_event.clear()

        # pylint: disable=consider-using-with
        cmd = [CONSUME_OUTPUT_TEST_SCRIPT, str(num_lines)]
        proc = subprocess.Popen(cmd, bufsize=-1, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        msg_thread = Thread(target=wd._consume_output, args=(proc.stdout, msg_func, test_event), daemon=True)
        msg_thread.start()

        # Wait for process to complete
        while proc.returncode is None:
            proc.poll()

            # Sleep and try again for process to complete
            time.sleep(1)

        # Wait for thread to complete
        while test_event.wait(1) is False:
            time.sleep(1)

    _helper_msg_func((), False)
    run_consume_test(20, _helper_msg_func)
    assert len(OUTPUT_LINES) == 20

    _helper_msg_func((), False)
    run_consume_test(2000, _helper_msg_func)
    assert len(OUTPUT_LINES) == 2000


def test_write_command_json():
    """Test the JSON writing function"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    test_object = {'This': 'is', 'a': 'test'}
    json_file = os.path.join(COMMAND_JSON_WRITE_PATH, 'test.json')

    # Successful test
    wd._write_command_json(json_file, test_object)

    # Error tests - TBD

    if os.path.exists(json_file):
        os.unlink(json_file)

def test_run_command():
    """Tests running a command"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd
    global OUTPUT_LINES

    # Run successful case
    _helper_msg_func((), False)
    res = wd._run_command(COMMAND_RUN_COMMAND, os.path.dirname(COMMAND_RUN_ARGUMENTS_FILE), os.getcwd(),
                          COMMAND_RUN_ARGUMENTS_FILE, _helper_msg_func, _helper_msg_func)
    assert res == 0
    assert os.path.exists(os.path.join(os.getcwd(), 'plots.geojson'))

    # Run successful case with additional mounts
    _helper_msg_func((), False)
    res = wd._run_command(COMMAND_RUN_COMMAND, os.path.dirname(COMMAND_RUN_ARGUMENTS_FILE), os.getcwd(),
                          COMMAND_RUN_ARGUMENTS_FILE, _helper_msg_func, _helper_msg_func, ((os.getcwd(), '/test_mount'),))
    assert res == 0
    assert os.path.exists(os.path.join(os.getcwd(), 'plots.geojson'))

    # Run with bad additional mounts - should still succeed
    _helper_msg_func((), False)
    res = wd._run_command(COMMAND_RUN_COMMAND, os.path.dirname(COMMAND_RUN_ARGUMENTS_FILE), os.getcwd(),
                          COMMAND_RUN_ARGUMENTS_FILE, _helper_msg_func, _helper_msg_func, (('invalid',),))
    assert res == 0
    assert os.path.exists(os.path.join(os.getcwd(), 'plots.geojson'))

    # Make sure we flagged the problem
    found = False
    for one_line in OUTPUT_LINES:
        if 'bad additional mount specified' in one_line:
            found = True
            break
    assert found == True


def test_get_results_json():
    """Tests getting the results JSON files"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd
    global OUTPUT_LINES

    # Non-recursive call
    _helper_msg_func((), False)
    res = wd._get_results_json(JSON_RESULT_FOLDER, _helper_msg_func, False)
    assert isinstance(res, dict)
    assert len(res) > 0

    # Recursive call
    _helper_msg_func((), False)
    res = wd._get_results_json(JSON_RESULT_RECURSE_FOLDER, _helper_msg_func, True)
    assert isinstance(res, list)
    assert len(res) == 2
    for one_res in res:
        assert len(res) > 0

    # No results, non-recursive
    empty_folder = tempfile.mkdtemp(dir=os.getcwd())
    _helper_msg_func((), False)
    res = wd._get_results_json(empty_folder, _helper_msg_func, False)
    assert isinstance(res, dict)
    assert len(res) == 0
    shutil.rmtree(empty_folder)

    # No results, non-recursive
    empty_folder = tempfile.mkdtemp(dir=os.getcwd())
    _helper_msg_func((), False)
    res = wd._get_results_json(empty_folder, _helper_msg_func, True)
    assert isinstance(res, list)
    assert len(res) == 0
    shutil.rmtree(empty_folder)


def test_repoint_files_json_dir():
    """Tests out the repointing of the contents of the found-files JSON"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Everything specified
    res = wd._repoint_files_json_dir(REPOINT_JSON_FILE, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is not None
    assert os.path.exists(res)

    # Load the file and make sure it's been updated
    with open(res, 'r', encoding='utf8') as in_file:
        updated = json.load(in_file)
    assert isinstance(updated, dict)
    assert 'FILE_LIST' in updated
    assert len(updated['FILE_LIST']) > 0
    assert updated['FILE_LIST'][0]['DIR'].startswith(REPOINT_JSON_TARGET_FOLDER)

    os.unlink(res)

    # Source folder is not specified (any value that evaluates to false works for this test)
    res = wd._repoint_files_json_dir(REPOINT_JSON_FILE, None, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is not None
    assert os.path.exists(res)

    # Load the file and make sure it's been updated
    with open(res, 'r', encoding='utf8') as in_file:
        updated = json.load(in_file)
    assert isinstance(updated, dict)
    assert 'FILE_LIST' in updated
    assert len(updated['FILE_LIST']) > 0
    assert updated['FILE_LIST'][0]['DIR'].startswith(REPOINT_JSON_TARGET_FOLDER)

    os.unlink(res)


def test_repoint_files_json_dir_error():
    """Tests error conditions for repointing of the contents of the found-files JSON"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    res = wd._repoint_files_json_dir('this is an invalid file path', REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is None

    res = wd._repoint_files_json_dir(REPOINT_JSON_FILE, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     'this is an invalid folder path')
    assert res is None

    # Generate a test file we can use
    out_fd, bad_json_file = tempfile.mkstemp(suffix='.json', dir=os.getcwd(), text=True)
    os.close(out_fd)

    # An empty JSON file
    with open(bad_json_file, 'w', encoding='utf8') as out_file:
        pass
    res = wd._repoint_files_json_dir(bad_json_file, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is None

    # A non-dict JSON file
    with open(bad_json_file, 'w', encoding='utf8') as out_file:
        json.dump([1,2,3], out_file)
    res = wd._repoint_files_json_dir(bad_json_file, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is None

    # Missing the FILE_LIST key
    with open(bad_json_file, 'w', encoding='utf8') as out_file:
        json.dump({'bad': 'data'}, out_file)
    res = wd._repoint_files_json_dir(bad_json_file, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is None

    # FILE_LIST is not a list, tuple, or set
    with open(bad_json_file, 'w', encoding='utf8') as out_file:
        json.dump({'FILE_LIST': 'bad data'}, out_file)
    res = wd._repoint_files_json_dir(bad_json_file, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is None

    # FILE_LIST item is missing a 'DIR' key (throws a KeyError exception)
    with open(bad_json_file, 'w', encoding='utf8') as out_file:
        json.dump({'FILE_LIST': [{'FILE': os.path.join(REPOINT_JSON_SOURCE_FOLDER, 'test.file')}]}, out_file)
    res = wd._repoint_files_json_dir(bad_json_file, REPOINT_JSON_SOURCE_FOLDER, REPOINT_JSON_TARGET_FOLDER,
                                     REPOINT_JSON_WORKING_FOLDER)
    assert res is None

    os.unlink(bad_json_file)
