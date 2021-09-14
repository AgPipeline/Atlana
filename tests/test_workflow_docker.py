"""Tests running docker workflows"""

import json
import os
import shutil
import subprocess
import tempfile
from threading import Event, Thread
import time
from typing import Optional, Union
from collections.abc import Callable, Iterable
import pytest

# pylint: disable=global-statement,protected-access

# Path to the testing workflow file and its associated parameter file
WORKFLOW_JSON_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow.json'))
WORKFLOW_PARAMS_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_params.json'))
WORKFLOW_QUEUE_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_queue.json'))

# File path for a bad JSON file
BAD_JSON_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_bad_json.json'))

# Queue step that has parameters to search for
FIND_PARAMETERS_STEP_INDEX = 0
# Parameters to search for
FIND_PARAMETERS_FIELDS = ('image', 'options')
# Mandatory parameters to have found ('image' is mandatory)
FIND_PARAMETERS_MANDATORY_INDEXES = (0,)

# The script to run when testing the consumption of output from a proc
CONSUME_OUTPUT_TEST_SCRIPT = os.path.realpath(os.path.join(os.getcwd(), 'tests', 'generate_output.sh'))

# Command JSON write path
COMMAND_JSON_WRITE_PATH = os.path.realpath(os.getcwd())

# Run command arguments file path
COMMAND_RUN_ARGUMENTS_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_run_args.json'))
COMMAND_RUN_COMMAND = 'shp2geojson'

# Path to single JSON result file
JSON_RESULT_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'result1'))
JSON_RESULT_RECURSE_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data/'))

# Path to the repoint JSON test file
REPOINT_JSON_FILE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_found_files.json'))
REPOINT_JSON_SOURCE_FOLDER = '/input/plotclip'
REPOINT_JSON_TARGET_FOLDER = '/changed_folder'
REPOINT_JSON_WORKING_FOLDER = os.path.realpath(os.getcwd())

# Paths to soilmask workflow files
WORKFLOW_SOILMASK_IMAGE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'orthomosaic.tif'))
WORKFLOW_SOILMASK_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_soilmask_result.json'))

# Paths to soilmask ratio workflow files
WORKFLOW_SOILMASK_RATIO_IMAGE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'orthomosaic.tif'))
WORKFLOW_SOILMASK_RATIO_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_soilmask_ratio_result.json'))

# Paths to plotclip workflow files
WORKFLOW_PLOTCLIP_IMAGE = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'orthomosaicmask.tif'))
WORKFLOW_PLOTCLIP_PLOTS = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'plots.geojson'))
WORKFLOW_PLOTCLIP_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_plotclip_result.json'))

# Paths to find-files files and values
WORKFLOW_FINDFILES_FILENAME = 'orthomosaicmask.tif'
WORKFLOW_FINDFILES_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data'))
WORKFLOW_FINDFILES_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_findfiles_result.json'))

# Path to canopycover files
WORKFLOW_CANOPYCOVER_FOUNDFILES = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'canopy_cover_files.json'))
WORKFLOW_CANOPYCOVER_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data'))
WORKFLOW_CANOPYCOVER_EXPERIMENT_FILE = None
WORKFLOW_CANOPYCOVER_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_canopycover_result.json'))

# Path to greenness indices files
WORKFLOW_GREENNESS_FOUNDFILES = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'canopy_cover_files.json'))
WORKFLOW_GREENNESS_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data'))
WORKFLOW_GREENNESS_EXPERIMENT_FILE = None
WORKFLOW_GREENNESS_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_greenness_result.json'))

# Path to merge csv files
WORKFLOW_MERGECSV_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data'))
WORKFLOW_MERGECSV_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_mergecsv_result.json'))
WORKFLOW_MERGECSV_FILES = ['canopycover.csv', 'rgb_plot.csv']

# Path to git algorithm files
WORKFLOW_GITREPO_URL = 'https://github.com/AgPipeline/transformer-rgb-indices.git'
WORKFLOW_GITREPO_BRANCH = 'main'
WORKFLOW_GITREPO_FOUNDFILES = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'canopy_cover_files.json'))
WORKFLOW_GITREPO_FOLDER = os.path.realpath(os.path.join(os.getcwd(), 'test_data'))
WORKFLOW_GITREPO_EXPERIMENT_FILE = None
WORKFLOW_GITREPO_RESULT = os.path.realpath(os.path.join(os.getcwd(), 'test_data', 'test_workflow_gitrepo_result.json'))

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


def _params_from_queue(command: str) -> Optional[dict]:
    """Returns the parameters associated with the command from the queue file"""
    with open(WORKFLOW_QUEUE_FILE, 'r', encoding='utf8') as in_file:
        queue = json.load(in_file)

    for one_command in queue:
        if 'command' in one_command and one_command['command'] == command:
            if 'parameters' in one_command:
                return one_command['parameters']

            msg = 'Command %s doesn\'t have parameters in queue file: %s' % (command, WORKFLOW_QUEUE_FILE)
            raise RuntimeError(msg)

    return None


def _compare_results_iterable(first: Iterable, second: Iterable, exclusions: tuple) -> bool:
    """Deep comparison of iterable result values (see _compare_results)
    Arguments:
        first - the first iterable to compare
        second - the second iterable to compare
        exclusions - a list of keys to ignore (passed through)
    Returns:
        Returns True if the iterables are the same, otherwise False
    """
    if exclusions is None:
        exclusions = ()

    # Make sure they're the same length
    if len(first) != len(second):
        return False

    # pylint: disable=consider-using-enumerate
    for idx in range(0, len(first)):
        # pylint: disable=unidiomatic-typecheck
        if type(first[idx]) != type(second[idx]):
            return False
        if isinstance(first[idx], dict):
            if not _compare_results(first[idx], second[idx], exclusions):
                return False
        elif isinstance(first[idx], str):
            if not first[idx] == second[idx]:
                return False
        elif isinstance(first[idx], Iterable):
            if not _compare_results_iterable(first[idx], second[idx], exclusions):
                return False
        elif not first[idx] == second[idx]:
            return False
    return True


def _compare_results(truth: dict, compare: dict, exclusions: tuple = None) -> bool:
    """Recursively compare workflow results ignoring the exclusion keys
    Arguments:
        truth - the truth dictionary
        compare - the dictionary to compare
        exclusions - a list of keys to ignore
    Returns:
        Returns True if the dictionaries are the same, otherwise False
    """
    exclusions = () if exclusions is None else exclusions

    # Basic key comparisons
    truth_keys = list(truth.keys())
    compare_keys = list(compare.keys())
    if len(truth) != len(compare_keys):
        return False
    diffs = list(set(truth_keys).symmetric_difference(set(compare_keys)))
    if len(diffs) > 0:
        return False

    # Keys match, compare values
    for one_key in truth_keys:
        # Check for exclusions
        if one_key in exclusions:
            continue

        # Compare
        # pylint: disable=unidiomatic-typecheck
        if type(truth[one_key]) != type(compare[one_key]):
            return False
        if isinstance(truth[one_key], dict):
            if not _compare_results(truth[one_key], compare[one_key], exclusions):
                return False
        elif isinstance(truth[one_key], str):
            if not truth[one_key] == compare[one_key]:
                return False
        elif isinstance(truth[one_key], Iterable):
            if not _compare_results_iterable(truth[one_key], compare[one_key], exclusions):
                return False
        elif not truth[one_key] == compare[one_key]:
            return False
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

    # pylint: disable=unsubscriptable-object
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
    assert found is True

    os.unlink(os.path.join(os.getcwd(), 'plots.geojson'))


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
        assert len(one_res) > 0

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

def test_handle_missing_parameters():
    """Tests the code to handle missing parameters"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    process_name = 'Testing'
    parameters = (100, 'test string')
    parameters_missing = (100, None)
    parameter_names = ('first parameter', 'second parameter')

    wd._handle_missing_parameters(process_name, parameters, parameter_names)

    with pytest.raises(RuntimeError) as except_info:
        wd._handle_missing_parameters(process_name, parameters_missing, parameter_names)
        assert except_info.message.startswith('Missing required parameter')


def test_handle_missing_files():
    """Tests the code that handles missing files"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Create a testing file
    out_fd, test_json_file = tempfile.mkstemp(suffix='.json', dir=os.getcwd(), text=True)
    os.close(out_fd)

    process_name = 'Testing missing files'
    parameters = (test_json_file,)
    parameters_missing = (test_json_file, os.path.splitext(test_json_file)[0] + 'invalid',)
    parameter_names = ('first file', 'second file')

    wd._handle_missing_files(process_name, parameters, parameter_names)

    with pytest.raises(RuntimeError) as except_info:
        wd._handle_missing_files(process_name, parameters_missing, parameter_names)
        assert except_info.message.startswith('Required files')

    os.unlink(test_json_file)


def test_handle_missing_folders():
    """Tests the code that handles missing files"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Create a testing folder
    test_folder = tempfile.mkdtemp(dir=os.getcwd())

    process_name = 'Testing missing folder'
    parameters = (test_folder,)
    parameters_missing = (test_folder, os.path.join(test_folder,'invalid'),)
    parameter_names = ('first folder', 'second folder')

    wd._handle_missing_folders(process_name, parameters, parameter_names)

    with pytest.raises(RuntimeError) as except_info:
        wd._handle_missing_folders(process_name, parameters_missing, parameter_names)
        assert except_info.message.startswith('Required folders')

    shutil.rmtree(test_folder)


def test_handle_soilmask():
    """Tests running the soilmask algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_SOILMASK_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_SOILMASK_IMAGE)

    parameters = _params_from_queue('soilmask')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'image':
            one_parameter['value'] = WORKFLOW_SOILMASK_IMAGE

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpsoilmask'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_soilmask(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    shutil.rmtree(working_folder)


def test_handle_soilmask_ratio():
    """Tests running the ratio-based soilmask algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_SOILMASK_RATIO_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_SOILMASK_RATIO_IMAGE)

    parameters = _params_from_queue('soilmask')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'image':
            one_parameter['value'] = WORKFLOW_SOILMASK_RATIO_IMAGE

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpsoilmaskratio'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_soilmask_ratio(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    shutil.rmtree(working_folder)


def test_handle_plotclip():
    """Tests running the plotclip algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_PLOTCLIP_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_PLOTCLIP_IMAGE)

    parameters = _params_from_queue('plotclip')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'image':
            one_parameter['value'] = WORKFLOW_PLOTCLIP_IMAGE
        elif one_parameter['field_name'] == 'geometries':
            one_parameter['value'] = WORKFLOW_PLOTCLIP_PLOTS

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpplotclip'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_plotclip(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert _compare_results(compare_json, res, ('timestamp', 'utc_timestamp', 'processing_time'))

    shutil.rmtree(working_folder)


def test_handle_find_files2json():
    """Tests running the plotclip algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_FINDFILES_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_FINDFILES_FOLDER)
    print("INPUT FOLDER", input_folder)

    # Setup fields for test
    parameters = _params_from_queue('find_files2json')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'file_name':
            one_parameter['value'] = WORKFLOW_FINDFILES_FILENAME
        elif one_parameter['field_name'] == 'top_path':
            one_parameter['value'] = WORKFLOW_FINDFILES_FOLDER

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpfindfiles'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_find_files2json(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    shutil.rmtree(working_folder)


def test_handle_canopycover():
    """Tests running the canopy cover algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd
    #import logging
    #logging.getLogger().setLevel(logging.DEBUG)

    # Load the result
    with open(WORKFLOW_CANOPYCOVER_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_CANOPYCOVER_FOUNDFILES)

    # Setup fields for test
    parameters = _params_from_queue('canopycover')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'found_json_file':
            one_parameter['value'] = WORKFLOW_CANOPYCOVER_FOUNDFILES
        elif one_parameter['field_name'] == 'results_search_folder':
            one_parameter['value'] = WORKFLOW_CANOPYCOVER_FOLDER
        elif one_parameter['field_name'] == 'experimentdata':
            one_parameter['value'] = WORKFLOW_CANOPYCOVER_EXPERIMENT_FILE

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpcanopycover'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_canopycover(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    shutil.rmtree(working_folder)


def test_handle_greenness_indices():
    """Tests running the greenness indices algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_GREENNESS_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_GREENNESS_FOUNDFILES)

    # Setup fields for test
    parameters = _params_from_queue('canopycover')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'found_json_file':
            one_parameter['value'] = WORKFLOW_GREENNESS_FOUNDFILES
        elif one_parameter['field_name'] == 'results_search_folder':
            one_parameter['value'] = WORKFLOW_GREENNESS_FOLDER
        elif one_parameter['field_name'] == 'experimentdata':
            one_parameter['value'] = WORKFLOW_GREENNESS_EXPERIMENT_FILE

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpgreenness'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_greenness_indices(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    shutil.rmtree(working_folder)


def test_handle_merge_csv():
    """Tests merging CSV files algorithm"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_MERGECSV_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = os.path.dirname(WORKFLOW_MERGECSV_FOLDER)

    # Setup fields for test
    parameters = _params_from_queue('merge_csv')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'top_path':
            one_parameter['value'] = WORKFLOW_MERGECSV_FOLDER

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpmergecsv'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_merge_csv(parameters, input_folder, working_folder, _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    for one_file in WORKFLOW_MERGECSV_FILES:
        assert os.path.exists(os.path.join(working_folder, one_file))

    shutil.rmtree(working_folder)


def test_handle_git_repo():
    """Tests fetching and running algorithm from a git repo"""
    # pylint: disable=import-outside-toplevel
    import workflow_docker as wd

    # Load the result
    with open(WORKFLOW_GITREPO_RESULT, 'r', encoding='utf8') as in_file:
        compare_json = json.load(in_file)

    # Setup fields for test
    input_folder = WORKFLOW_GITREPO_FOLDER

    # Setup fields for test
    parameters = _params_from_queue('canopycover')
    for one_parameter in parameters:
        if one_parameter['field_name'] == 'found_json_file':
            one_parameter['value'] = WORKFLOW_GITREPO_FOUNDFILES
        elif one_parameter['field_name'] == 'results_search_folder':
            one_parameter['value'] = WORKFLOW_GITREPO_FOLDER
        elif one_parameter['field_name'] == 'experimentdata':
            one_parameter['value'] = WORKFLOW_GITREPO_EXPERIMENT_FILE

    # Create a working folder
    working_folder = os.path.realpath(os.path.join(os.getcwd(), 'tmpgitrepo'))
    os.makedirs(working_folder, exist_ok=True)

    # Clear messages and run the function
    _helper_msg_func((), False)
    res = wd.handle_git_repo(WORKFLOW_GITREPO_URL, WORKFLOW_GITREPO_BRANCH, parameters, input_folder, working_folder,
                             _helper_msg_func, _helper_msg_func)

    assert res is not None
    assert res == compare_json

    shutil.rmtree(working_folder)
