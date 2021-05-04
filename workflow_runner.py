#!/usr/bin/env python3
"""Simple workflow runner"""

import os
import argparse
from shutil import copyfile
import io
import json
import random
import time
import shutil
import subprocess
from typing import Optional
# TODO: logging

DOCKER_IMAGE = 'agdrone/drone-workflow:1.1'

# File names to store out output into
QUEUE_FILE_NAME = 'queue'
STDOUT_FILE_NAME = 'messages.txt'
STDERR_FILE_NAME = 'errors.txt'
STATUS_FILE_NAME = 'status.json'

# Status keys
STATUS_STARTING = "starting"
STATUS_RUNNING = "running"
STATUS_COMPLETED = "completion"


# Definitions to use when writing and there may be conflicts with readers and other writers
WRITING_LOG_RETRY_COUNT = 30
WRITING_LOG_RETRY_BACKOFFS = [0.1, 0.2, 0.4, 0.6, 0.7]
WRITING_LOG_RETRY_RAND_MIN = 0.1    # Lower end of random backoff seconds
WRITING_LOG_RETRY_RAND_MAX = 5.0    # Upper end of random backoff seconds

# Maximum lines of output that's cached before being written to disk
MAX_CACHED_OUTPUT_LINES = 40


def _setup_working_folder(top_folder: str, subfolder: str)-> str:
    """Ensure the working folder is setup for a workflow
    Arguments:
        top_folder: the top level folder
        subfolder: the subfolder to make sure is properly prepared
    Return:
        Returns the full path to the working folder that's been prepared
    Exceptions:
        Raises a Runtime exception if the top folder is invalid or not accessible, or if there was a problem
        creating or tidying up the working folder
    """
    if not os.path.isdir(top_folder):
        msg = 'Setup working folder: top level folder is not a valid directory "%s"' % top_folder
        print(msg, subfolder)
        raise RuntimeError(msg)

    working_folder = os.path.join(top_folder, subfolder)

    # If our folder doesn't exist, try to create it. Otherwise, clean it up
    if not os.path.isdir(working_folder):
        try:
            os.mkdir(working_folder)
        except Exception as ex:
            msg = 'Exception caught while creating command working folder "%s"' % top_folder
            print(msg, ex)
            raise RuntimeError(msg) from ex
    else:
        for one_name in os.listdir(working_folder):
            cur_path = os.path.join(working_folder, one_name)
            try:
                if not os.path.isdir(cur_path):
                    os.unlink(cur_path)
                else:
                    shutil.rmtree(cur_path)
            except OSError as ex:
                msg = 'OSError exception caught while cleaning file/folder "%s"' % cur_path
                print(msg, ex)
                print('... ignoring exception and continuing cleanup of folder "%s"' % working_folder)
            except Exception as ex:
                msg = 'Unknown exception caught while cleaning file/folder "%s"' % cur_path
                print(msg, ex)
                print('... ignoring exception and continuing cleanup of folder "%s"' % working_folder)

    return working_folder


def _load_json_file(filename: str, error_file: str=None) -> Optional[object]:
    """Handles loading a JSON file
    Arguments:
        filename: the path to the JSON file
        error_file: optional file name to write errors to
    Return:
        Returns the contents of the loaded JSON file
    """
    result = None
    try:
        with open(filename, 'r') as in_file:
            result = json.load(in_file)
    except json.JSONDecodeError as ex:
        msg = 'A JSON decode error was caught while loading JSON file "%s"' % filename
        print(msg, ex)
        if error_file:
            write_error(error_file, (msg), ex)
    except Exception as ex:
        msg = 'An unknown exception was caught while loading JSON file "%s"' % filename
        print(msg, ex)
        if error_file:
            write_error(error_file, (msg), ex)

    return result


def _write_log_file(filename: str, lines: tuple, append: bool=True) -> bool:
    """Writes to the file with conflict detection and backoff
    Arguments:
        filename: the path to the file to write lines to
        lines: a tuple of the lines to write (assumed to be a tuple of strings)
        append: append the lines to the end of the file when True. Overwrite an existing file, or create a new one when False
    Return:
        Returns True if all the lines were written and False if they were not. It's possible for a partial set of lines to be
        written; when the disk is full, for example
    """
    # pylint: disable=too-many-branches
    opened_file = None
    return_value = False

    # If we're not appending, we write a new file
    if not append or not os.path.exists(filename):
        mode = 'w'
        if os.path.exists(filename):
            os.unlink(filename)
    else:
        mode = 'a'

    # Try really hard to write to the file
    for try_count in range(0, WRITING_LOG_RETRY_COUNT):
        try:
            # pylint: disable=consider-using-with
            opened_file = open(filename, mode)
        except OSError as ex:
            msg = 'Exception opening log file "%s" for writing "%s"' % (filename, mode)
            print(msg, ex)
        except Exception as ex:
            msg = 'Unknown exception opening log file "%s" for writing "%s"' % (filename, mode)
            print(msg, ex)

        # Check for success
        if opened_file is not None:
            break

        # Back off and wait before trying again
        if try_count < len(WRITING_LOG_RETRY_BACKOFFS):
            sleep_time = WRITING_LOG_RETRY_BACKOFFS[try_count]
        else:
            sleep_time = random.uniform(WRITING_LOG_RETRY_RAND_MIN, WRITING_LOG_RETRY_RAND_MAX)

        print('Sleeping before retrying open:', sleep_time, 'seconds')
        time.sleep(sleep_time)

    if opened_file is None:
        msg = 'Unable to open log file "%s" for writing "%s"' % (filename, mode)
        print(msg)
        return return_value

    try:
        for one_line in lines:
            opened_file.write(one_line)
        return_value = True
    except Exception as ex:
        msg = 'Exception caught while writing to log file "%s"' % filename
        print(msg, ex)
    finally:
        opened_file.close()

    # Return the result
    return return_value


def _find_parameter_values(parameters: list, field_names: tuple) -> tuple:
    """Returns a tuple of found parameter values associated with the field names
    Arguments:
        parameters: the list of parameters to search
        field_names: the ordered tuple of field names
    Return:
        A tuple containing found field values associated with the specified field names, in the same order of the field names.
        If a field name is not found, None is returned in its place.
    """
    found = {}
    for one_parameter in parameters:
        found[one_parameter['field_name']] = one_parameter['value']

    return (found.get(one_name, None) for one_name in field_names)


def _replace_folder_path(path: str, from_folder: str, to_folder: str) -> Optional[str]:
    """Changes the path from the source ('from') folder to the destination ('to') folder
    Arguments:
        path: the path to adjust
        from_folder: the folder to change from
        to_folder: the folder to change the path to
    Return:
        A copy of the path with the folder changed when 'path' starts with 'from_folder', othwerwise
        None is returned
    Notes:
        Only fully qualified partial paths are considered valid. Thus, '/a/b/c' is NOT considered the start of path '/a/b/concord', but
        is the considered the start of '/a/b/c' and '/a/b/c/dogs.csv'
    """
    # Make sure we have a legitimate 'from' path
    if not path.startswith(from_folder):
        return None

    check_idx = len(from_folder)
    if from_folder[-1:] == '/' or from_folder[-1:] == '\\':
        check_idx -= 1
    if not path[check_idx] =='/' and not path[check_idx] =='\\':
        return None

    #  Return the new path
    rem = path[len(from_folder):]
    if rem[0] == '/' or rem[0] == '\\':
        rem = rem[1:]

    return os.path.join(to_folder, rem)


def  _consume_output(reader: io.BufferedReader, output_filename: str):
    """Consumes the output from reader and writes it to the file
    Arguments:
        reader: object to read from
        output_filename: the path of the file to write to
    """
    if reader is None:
        return

    lines = []
    print("READING")
    while True:
        try:
            line = reader.readline()
            if line:
                if isinstance(line, bytes):
                    line = line.decode('UTF-8')

                print(line.rstrip('\n'))
                lines.append(line)
                if len(lines) >= MAX_CACHED_OUTPUT_LINES:
                    print("   writing log", out_files[idx])
                    _write_log_file(out_files[idx], lines, True)
                    lines = []
            else:
                break
    except Exception as ex:
        print("Ignoring exception while waiting on messages: %s", str(ex))

    if lines:
        print("   finishing up write")
        _write_log_file(out_files[idx], lines, True)


def _consume_proc_output(stdout: io.BufferedReader, stderr: io.BufferedReader, msg_filename: str, err_filename: str):
    """Consumes output from the specified process
    Arguments:
        stdout: the stream to read messages from
        stderr: the stream to read errors from
        msg_filename: the file to  write messages to
        err_filename: the file to write errors to
    Notes:
        Assumes the process was started with stdout being piped
    """
    # pylint: disable=too-many-nested-blocks
    file_readers = [stdout, stderr]
    out_files = [msg_filename, err_filename]

    try:
        for idx in range(0, 2):
            reader = file_readers[idx]
            if reader is not None:
                lines = []
                print("READING", idx)
                while True:
                    line = reader.readline()
                    if line:
                        if isinstance(line, bytes):
                            print("  decode line")
                            line = line.decode('UTF-8')

                        print(line.rstrip('\n'))
                        lines.append(line)
                        if len(lines) >= MAX_CACHED_OUTPUT_LINES:
                            print("   writing log", out_files[idx])
                            _write_log_file(out_files[idx], lines, True)
                            lines = []
                    else:
                        break

                if lines:
                    print("   finishing up write")
                    _write_log_file(out_files[idx], lines, True)

    except Exception as ex:
        print("Ignoring exception while waiting on messages: %s", str(ex))


def _write_command_json(json_file_path: str, json_args: object):
    """Writes the passed in object the specific file
    Arguments:
        json_file_path: the file to write to
        json_args: the json to write to the file
    Exceptions:
        Raises RunttimeError if a problem occurs when writing out the JSON
    """
    with open(json_file_path, 'wt')as out_file:
        try:
            out_file.write(json.dumps(json_args, indent=2))
        except json.JSONDecodeError as ex:
            msg = 'JSON exception caught while writing command arguments to "%s"' % json_file_path
            print(msg, ex)
            raise RuntimeError(msg) from  ex
        except OSError as ex:
            msg = 'OS exception caught while writing command arguments to "%s"' % json_file_path
            print(msg, ex)
            raise RuntimeError(msg) from  ex
        except Exception as ex:
            msg = 'Unknown exception caught while writing command arguments to "%s"' % json_file_path
            print(msg, ex)
            raise RuntimeError(msg) from  ex


def _run_command(command: str, input_folder: str, output_folder: str, json_file_path: str, msg_file: str, err_file: str):
    """Handles the details of executing the docker image command
    Arguments:
        command: the command string to run
        input_folder: the folder containing the command input
        output_folder: the folder containing the command output
        json_file_path: the JSON file to pass to the command
        msg_file: file to write messages to
        err_file: file to write errors to
    """
    run_command = ['docker',
                   'run',
                   '--rm',
                   '-v',
                   input_folder + ':/input',
                   '-v',
                   output_folder + ':/output',
                   '-v',
                   json_file_path + ':/scif/apps/src/jx-args.json',
                   DOCKER_IMAGE,
                   'run',
                   command
                  ]

    print("Running command", run_command)
    # pylint: disable=consider-using-with
    proc = subprocess.Popen(run_command, bufsize=-1, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    return_value = -1
    if proc:
        # Loop here processing the output until the proc finishes
        print('Waiting for process to finish')
        while proc.returncode is None:
            if proc.stderr is not None or proc.stdout is not None:
                print("ABOUT TO CONSUME")
                _consume_proc_output(proc.stdout, proc.stderr, msg_file, err_file)
                print("DONE CONSUMING")
                proc.poll()
                print("DONE POLLING")

            # Sleep and try again for process to complete
            time.sleep(1)

        print("Return code:", str(proc.returncode))
        return_value = proc.returncode

    return return_value

def _get_results_json(working_folder: str, error_file: str=None) -> Optional[object]:
    """ Loads and returns the json resulting from running the workflow
    Arguments:
        working_folder: the folder the results are stored in
        error_file: the file to write errors to
    Returns:
        The contents of the results file
    """
    results_path = os.path.join(working_folder, 'result.json')
    if not os.path.exists(results_path):
        return None

    res = _load_json_file(results_path, error_file)

    if 'file' in res:
        mapped_files = []
        for one_file in res['file']:
            if 'path' in one_file:
                one_file['path'] = _replace_folder_path(one_file['path'], '/output', working_folder)
            mapped_files.append(one_file)
        res['file'] = mapped_files

    return res


def handle_soilmask(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str) -> dict:
    """Handle running the soilmask algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command
    """
    # Find our arguments
    image_path, options = _find_parameter_values(parameters, ('image', 'options'))

    # Ensure we have our mandatory parameters
    if image_path is None:
        msg = 'Missing required parameter "image" for soilmask'
        print(msg, input_folder, parameters)
        raise RuntimeError(msg)
    if not os.path.exists(image_path) or not os.path.isfile(image_path):
        msg = 'Required parameter "image" for soilmask is missing, or, not a file "%s"' % image_path
        print(msg, input_folder, parameters)
        raise RuntimeError(msg)

    if options is None:
        options = ''

    # Get the output masked file name
    cur_filename, cur_ext = os.path.splitext(os.path.basename(image_path))
    mask_filename = cur_filename + '_mask' + cur_ext

    # Write the JSON arguments to disk for the command
    json_args = {
        'SOILMASK_SOURCE_FILE': _replace_folder_path(image_path, input_folder, '/input'),
        'SOILMASK_MASK_FILE': mask_filename,
        'SOILMASK_WORKING_FOLDER': '/output',
        'SOILMASK_OPTIONS': options,
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    print("Command JSON", json_args)

    # Run the command
    ret_value = _run_command('soilmask', input_folder, working_folder, json_file_path, msg_file, err_file)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_file)

    return command_results


def handle_soilmask_ratio(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str):
    """Handle running the soilmask by ratio algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    """
    # Find our arguments
    image_path, ratio, options = _find_parameter_values(parameters, ('image', '', 'options'))

    # Ensure we have our mandatory parameters
    if image_path is None:
        msg = 'Missing required parameter "image" for soilmask_ratio'
        print(msg, input_folder, parameters)
        raise RuntimeError(msg)
    if not os.path.exists(image_path) or not os.path.isfile(image_path):
        msg = 'Required parameter "image" for soilmask_ratio is missing, or, not a file "%s"' % image_path
        print(msg, input_folder, parameters)
        raise RuntimeError(msg)

    if options is None:
        options = ''

    # Determine if we have a ratio and default it if not
    if ratio is None:
        ratio = 1.0
    options += ' --ratio ' + str(ratio)

    # Get the output masked file name
    cur_filename, cur_ext = os.path.splitext(os.path.basename(image_path))
    mask_filename = cur_filename + '_mask' + cur_ext

    # Write the JSON arguments to disk for the command
    json_args = {
        'SOILMASK_RATIO_SOURCE_FILE': _replace_folder_path(image_path, input_folder, '/input'),
        'SOILMASK_RATIO_MASK_FILE': mask_filename,
        'SOILMASK_RATIO_WORKING_FOLDER': '/output',
        'SOILMASK_RATIO_OPTIONS': options,
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    print("Command JSON", json_args)

    # Run the command
    ret_value = _run_command('soilmask_ratio', input_folder, working_folder, json_file_path, msg_file, err_file)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_file)

    return command_results


def handle_plotclip(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str):
    """Handle running the plotclip algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    """
    image_path, plot_geometries, options = _find_parameter_values(parameters, ('image','geometries','options'))

    # Ensure we have our mandatory parameters
    missing_parameters = []
    if image_path is None:
        missing_parameters.append('image')
    if plot_geometries is None:
        missing_parameters.append('plot_geometries')
    if missing_parameters:
        msg = 'Missing required parameter(s) "' + '","'.join(missing_parameters) + '"" for plot clip'
        print(msg, input_folder, parameters)
        raise RuntimeError(msg)
    del missing_parameters

    invalid_parameters =  []
    invalid_values = []
    if not os.path.exists(image_path) or not os.path.isfile(image_path):
        invalid_parameters.append('image')
        invalid_values.append(image_path)
    if not os.path.exists(plot_geometries) or not os.path.isfile(plot_geometries):
        invalid_parameters.append('geometries')
        invalid_values.append(plot_geometries)
    if invalid_parameters:
        msg = 'Required parameters "' + ('","'.join(invalid_parameters)) + '" for plot clip are missing, or, not are not files: "' + \
              ('","'.join(invalid_values)) + '"'
        print(msg, input_folder, parameters)
        raise RuntimeError(msg)

    # Write the arguments
    json_args = {
        'PLOTCLIP_SOURCE_FILE': _replace_folder_path(image_path, input_folder, '/input'),
        'PLOTCLIP_PLOTGEOMETRY_FILE': _replace_folder_path(plot_geometries, input_folder, '/input'),
        'PLOTCLIP_WORKING_FOLDER': '/output',
        'PLOTCLIP_OPTIONS': options,
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    print("Command JSON", json_args)

    # Run the command
    ret_value = _run_command('plotclip', input_folder, working_folder, json_file_path, msg_file, err_file)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_file)

    return command_results


def handle_find_files2json(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str):
    """Handle running the file finding algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    """


def handle_canopycover(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str):
    """Handle running the canopy cover algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    """


def handle_greenness_indices(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str):
    """Handle running the greenenss algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    """


def handle_merge_csv(parameters: tuple, input_folder: str, working_folder: str, msg_file: str, err_file: str):
    """Handle running the merging csv files algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_file: path to write messages to
        err_file: path to write errors to
    """


def parse_args() -> tuple:
    """Parses the command line arguments
    Return:
        A tuple containing the command line arguments
    """
    parser = argparse.ArgumentParser(description='Processes a command queue')
    parser.add_argument('workdir', help='the working folder containing the queued commands to execute')

    args =  parser.parse_args()

    if not args.workdir or not os.path.exists(args.workdir):
        raise RuntimeError('Invalid or missing folder specified "%s"' % args.workdir)

    workflow_folder = args.workdir
    if os.path.isdir(workflow_folder):
        workflow_file = os.path.join(workflow_folder, QUEUE_FILE_NAME)
    else:
        workflow_file = workflow_folder
        workflow_folder = os.path.dirname(workflow_folder)

    return workflow_folder, workflow_file


def write_error(filename: str, messages: tuple, exception: Exception=None):
    """Writes the error message to the error file
    Arguments:
        filename: the name of the file to write to
        messages: a tuple of messages to write to the file - each element is cast to a string before writing
        exception: an optional exception associated with the error
    """
    _ = _write_log_file(filename, messages + str(exception))


def write_status(filename: str, status: str, message: object):
    """Writes the status message to the status file
    Arguments:
        filename: the name of the file to write to
        status: the status to write to the file
        message: the message associated with the status
    """
    lines = (json.dumps({status: message}, indent=2),)
    _ = _write_log_file(filename, lines, append=False)


def prepare_prev_results(parameters: list, res: dict, input_folder: str) -> list:
    """Incorporates the previous results into the current parameters, when applicable
    Arguments:
        parameters: the list of parameters
        res: the results to incorporate
        input_folder: the folder to copy referenced files to
    Returns:
        The list of adjusted parameters
    """
    # pylint: disable=too-many-nested-blocks
    adjusted = []
    for one_parameter in parameters:
        cur_param = {**one_parameter}
        if 'prev_command_path' in one_parameter:
            # Try to find what they're looking for
            result_parts = one_parameter['prev_command_path'].split(':')
            missing_part = False
            working_res = res
            for one_part in result_parts:
                if isinstance(working_res, dict) and one_part in working_res:
                    working_res = working_res[one_part]
                elif isinstance(working_res, (list, tuple, set)):
                    try:
                        index = int(one_part)
                        if 0 <= index < len(working_res):
                            working_res = working_res[index]
                        else:
                            print('Invalid index specified for previous result value', one_parameter['prev_command_path'], working_res)
                            missing_part = True
                            break
                    except ValueError as ex:
                        print('Invalid index value', one_part, 'specified for previous result value', one_parameter['prev_command_path'])
                        missing_part = True
                        break
                else:
                    missing_part = True
                    break

            # Add the adjusted parameter. We don't throw an error here since we don't know if a missing
            # value is important or not
            if missing_part:
                print('Unable to find previous result value', one_parameter['prev_command_path'], res)
            #else:
                # If the result is a file, copy it to the input folder
                #if os.path.exists(working_res):
                #    dest_file = os.path.join(input_folder, os.path.basename(working_res))
                #    copyfile(working_res, dest_file)
                #    working_res = dest_file

            cur_param['value'] = working_res if missing_part is False else None

        adjusted.append(cur_param)

    print("HACK: Returning adjusted", adjusted)
    return adjusted


def run_workflow():
    """ Runs the workflow passed in on the command line"""
    # pylint: disable=too-many-branches
    working_folder, workflow_file = parse_args()

    status_filename = os.path.join(working_folder, STATUS_FILE_NAME)
    message_filename = os.path.join(working_folder, STDOUT_FILE_NAME)
    error_filename = os.path.join(working_folder, STDERR_FILE_NAME)

    # Clean up from a previous run if necessary
    if os.path.exists(status_filename):
        os.unlink(status_filename)
    if os.path.exists(message_filename):
        os.unlink(message_filename)
    if os.path.exists(error_filename):
        os.unlink(error_filename)

    # Indicate our status
    write_status(status_filename, STATUS_STARTING, {'message': 'Preparing workflow'})

    # Load our commands
    commands = _load_json_file(workflow_file, error_filename)
    if commands is None:
        write_status(status_filename, STATUS_COMPLETED, {'error': 'Unable to start workflow'})
        return

    if commands is None:
        msg = 'No commands were found to execute'
        print (msg + ':', workflow_file)
        write_status(status_filename, STATUS_COMPLETED, {'message': msg})
        return

    #  Process the commands
    res = None
    wrote_final_status = False
    for one_command in commands:
        command_name = one_command['command']
        command_working_folder = _setup_working_folder(working_folder, command_name)
        print("Incorporate", res)
        parameters = prepare_prev_results(one_command['parameters'], res, working_folder)
        print('Running command ', command_name)
        write_status(status_filename, STATUS_RUNNING, {'message': 'Running ' + command_name})
        if command_name == 'soilmask':
            res = handle_soilmask(parameters, working_folder, command_working_folder, message_filename, error_filename)
        elif command_name == 'soilmask_ratio':
            res = handle_soilmask_ratio(parameters, working_folder, command_working_folder, message_filename, error_filename)
        elif command_name == 'plotclip':
            res = handle_plotclip(parameters, working_folder, command_working_folder, message_filename, error_filename)
        elif command_name == 'find_files2json':
            res = handle_find_files2json(parameters, working_folder, command_working_folder, message_filename, error_filename)
        elif command_name == 'canopycover':
            res = handle_canopycover(parameters, working_folder, command_working_folder, message_filename, error_filename)
        elif command_name == 'greenness_indices':
            res = handle_greenness_indices(parameters, working_folder, command_working_folder, message_filename, error_filename)
        elif command_name == 'merge_csv':
            res = handle_merge_csv(parameters, working_folder, command_working_folder, message_filename, error_filename)
        else:
            msg = 'Unknown command found "%s"' % command_name
            print(msg, workflow_file)
            write_status(status_filename, STATUS_COMPLETED, {'error': msg})
            wrote_final_status = True
            break

        prev_working_folder = command_working_folder

    #  If we haven't written out final status yet, do so now
    if wrote_final_status is False:
        write_status(status_filename, STATUS_COMPLETED, {'message': 'Commpleted'})


if __name__ == "__main__":
    run_workflow()
