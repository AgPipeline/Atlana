#!/usr/bin/env python3
"""Docker workflow runner"""

import os
import io
import json
import time
import sys
import subprocess
from typing import Optional
from threading import Event, Thread
from collections.abc import Callable
import logging

DOCKER_IMAGE = 'agdrone/drone-workflow:1.1'

# Maximum lines of output that's cached before being written to disk
MAX_CACHED_OUTPUT_LINES = 40

# Definitions for waiting on command outputs
MAX_READER_WAIT_LOOP = 200
MAX_READER_WAIT_SEC  = 0.1


def get_command_map() -> dict:
    """Returns the mapping of commands to functions
    Return:
        A dictionary of command names and their handler
    """
    current_module = sys.modules[__name__]
    return {
        'soilmask': current_module.handle_soilmask,
        'soilmask_ratio': current_module.handle_soilmask_ratio,
        'plotclip': current_module.handle_plotclip,
        'find_files2json': current_module.handle_find_files2json,
        'canopycover': current_module.handle_canopycover,
        'greenness_indices': current_module.handle_greenness_indices,
        'merge_csv': current_module.handle_merge_csv
    }


def _load_json_file(filename: str, error_func: Callable=None) -> Optional[object]:
    """Handles loading a JSON file
    Arguments:
        filename: the path to the JSON file
        error_func: optional function to write errors to
    Return:
        Returns the contents of the loaded JSON file
    """
    result = None
    try:
        with open(filename, 'r') as in_file:
            result = json.load(in_file)
    except json.JSONDecodeError as ex:
        msg = 'A JSON decode error was caught while loading JSON file "%s"' % filename
        logging.exception(msg)
        if error_func:
            error_func((msg, str(ex)))
    except Exception as ex:
        msg = 'An unknown exception was caught while loading JSON file "%s"' % filename
        logging.exception(msg)
        if error_func:
            error_func((msg, str(ex)))

    return result


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
        logging.debug('Replace folder path: original path "%s" doesn\'t start with expected folder "%s"', path, from_folder)
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


def _consume_output(reader: io.BufferedReader, output_func: Callable, done_event: Event):
    """Consumes the output from reader and writes it to the file
    Arguments:
        reader: object to read from
        output_func: the function to write to
        done_event: the event to set when we're done
    """
    if reader is None:
        return

    lines = []
    while True:
        try:
            line = reader.readline()
            if line:
                if isinstance(line, bytes):
                    line = line.decode('UTF-8')

                logging.debug(line.rstrip('\n'))
                lines.append(line)
                if len(lines) >= MAX_CACHED_OUTPUT_LINES:
                    output_func(lines, True)
                    lines = []
            else:
                break
        except Exception:
            logging.exception("Ignoring exception while waiting on messages")

    if lines:
        output_func(lines, True)

    done_event.set()


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
            logging.exception(msg)
            raise RuntimeError(msg) from  ex
        except OSError as ex:
            msg = 'OS exception caught while writing command arguments to "%s"' % json_file_path
            logging.exception(msg)
            raise RuntimeError(msg) from  ex
        except Exception as ex:
            msg = 'Unknown exception caught while writing command arguments to "%s"' % json_file_path
            logging.exception(msg)
            raise RuntimeError(msg) from  ex


def _run_command(command: str, input_folder: str, output_folder: str, json_file_path: str, msg_func: Callable, err_func: Callable,
                 additional_mounts: tuple=None):
    """Handles the details of executing the docker image command
    Arguments:
        command: the command string to run
        input_folder: the folder containing the command input
        output_folder: the folder containing the command output
        json_file_path: the JSON file to pass to the command
        msg_func: function to write messages to
        err_func: function to write errors to
        additional_mounts: tuple of additional mount commands for the docker command; one or more [source_path, mount_point] pairs
    """
    run_command = ['docker',
                   'run',
                   '--rm',
                   '-v',
                   input_folder + ':/input',
                   '-v',
                   output_folder + ':/output',
                   '-v',
                   json_file_path + ':/scif/apps/src/jx-args.json'
                   ]

    if additional_mounts is not None:
        for one_mount in additional_mounts:
            if len(one_mount) == 2:
                run_command.append('-v')
                run_command.append(one_mount[0] + ':' + one_mount[1])
            else:
                msg1 = 'Warning: bad additional mount specified: %s' % str(one_mount)
                msg2 = '         should consist of a [source path, mount path] pair'
                logging.warning(msg1)
                logging.warning(msg2)
                msg_func((msg1, msg2), True)

    run_command.extend([DOCKER_IMAGE, 'run', command])

    logging.debug("Running command: %s", run_command)
    # pylint: disable=consider-using-with
    proc = subprocess.Popen(run_command, bufsize=-1, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    return_value = -1
    if proc:
        msg_event = Event()
        err_event = Event()
        msg_event.clear()
        err_event.clear()
        msg_thread = Thread(target=_consume_output, args=(proc.stdout, msg_func, msg_event), daemon=True)
        err_thread = Thread(target=_consume_output, args=(proc.stderr, err_func, err_event), daemon=True)
        msg_thread.start()
        err_thread.start()

        # Loop here processing the output until the proc finishes
        logging.debug('Waiting for process to finish')
        while proc.returncode is None:
            proc.poll()

            # Sleep and try again for process to complete
            time.sleep(1)

        logging.debug("Return code: %s", str(proc.returncode))
        return_value = proc.returncode

        # Wait for the rest of the command's ouput to be read
        logging.debug("Checking on readers")
        cur_wait_counter = 0
        displayed_message = False
        skipped_messages = 0
        while (msg_event.wait(1) is False or err_event.wait(1) is False) and cur_wait_counter < MAX_READER_WAIT_LOOP:
            if displayed_message is False or skipped_messages % 10 == 0:
                logging.debug("Sleeping on readers: %d", cur_wait_counter)
                displayed_message = True
                skipped_messages = 0
            time.sleep(MAX_READER_WAIT_SEC)
            cur_wait_counter += 1
            skipped_messages += 1

    if msg_event.wait(1) is False or err_event.wait(1) is False:
        logging.error('Unable to retrieve messages and/or errors for command: %s', command)
        logging.warning('Ignoring problems with fetching output for command: %s', command)

    return return_value


def _get_results_json(working_folder: str, error_func: Callable=None, recursive: bool=False) -> Optional[object]:
    """ Loads and returns the json resulting from running the workflow
    Arguments:
        working_folder: the folder the results are stored in
        error_func: the function to write errors to
        recursive: will recurse into subfolders when True. Otherwise only working_folder is checked
    Returns:
        The contents of the results file when not recursive. When recursive a list of all the results is returned
    """
    # pylint: disable=too-many-nested-blocks,too-many-branches
    res = {}
    results_path = os.path.join(working_folder, 'result.json')
    if os.path.exists(results_path):
        res = _load_json_file(results_path, error_func)

        if 'file' in res:
            mapped_files = []
            for one_file in res['file']:
                if 'path' in one_file:
                    one_file['path'] = _replace_folder_path(one_file['path'], '/output', working_folder)
                mapped_files.append(one_file)
            res['file'] = mapped_files

        if 'container' in res:
            mapped_container = []
            for one_entry in res['container']:
                if 'file' in one_entry:
                    mapped_files = []
                    for one_file in one_entry['file']:
                        if 'path' in one_file:
                            one_file['path'] = _replace_folder_path(one_file['path'], '/output', working_folder)
                        mapped_files.append(one_file)
                    one_entry['file'] = mapped_files
                mapped_container.append(one_entry)
            res['container'] = mapped_container

    if recursive is True:
        res = [res] if res else []
        for one_file in os.listdir(working_folder):
            cur_path = os.path.join(working_folder, one_file)
            if os.path.isdir(cur_path):
                new_results = _get_results_json(cur_path, error_func, recursive)
                for one_result in new_results:
                    if one_result:
                        res.append(one_result)

    return res


def _repoint_files_json_dir(filename: str, source_folder: str, target_folder: str, working_folder: str) -> Optional[str]:
    """ Repoints the DIR entry in the JSON file to the target folder
    Arguments:
        filename: the file to load and process
        source_folder: the source folder to replace with target folder; if empty or None, a best guess is applied
        target_folder: the target folder for the DIR entries
        working_folder: the working folder to place the updated file in
    Return:
        The name of the adjusted JSON file when successful. Otherwise the None is returned
    Notes:
        The new file will be have the same name as the original, but will be in the working folder. If a file by that name
        already exists in the working folder, it will be overwritten.
    """
    # Check parameters
    if not os.path.isfile(filename):
        msg = 'Invalid file specified to repoint files JSON "%s"' % filename
        logging.warning(msg)
        return None
    if not os.path.isdir(working_folder):
        msg = 'Invalid working folder specified to repoint files JSON "%s"' % working_folder
        logging.warning(msg)
        return None

    # Load the JSON
    file_json = _load_json_file(filename)
    if file_json is None:
        msg = 'Unable to load JSON file when repointing files JSON "%s"' % filename
        logging.warning(msg)
        return None
    if not isinstance(file_json, dict):
        msg = 'Unknown JSON format when repointing files JSON "%s"' % filename
        logging.warning(msg)
        return None
    if 'FILE_LIST' not in file_json:
        msg = 'JSON missing FILE_LIST key when repointing files JSON "%s"' % filename
        logging.warning(msg)
        return None

    new_file = os.path.join(working_folder, os.path.basename(filename))
    all_files = file_json['FILE_LIST']
    if not isinstance(all_files, list) and not isinstance(all_files, tuple) and not isinstance(all_files, set):
        msg = 'FILE_LIST value is not a list of files for repointing files JSON "%s"' % filename
        logging.warning(msg)
        return None

    try:
        # Make sure we have a source folder to work with
        if not source_folder:
            cur_path = all_files[0]['DIR']
            if cur_path[-1:] =='/' or cur_path[-1:] =='\\':
                cur_path = cur_path[:len(cur_path) - 1]
            source_folder = os.path.dirname(cur_path)

        # Run through the files that we have
        new_files = []
        for one_file in all_files:
            cur_file = {**one_file}
            if cur_file['DIR'].startswith(source_folder):
                cur_file['DIR'] = _replace_folder_path(cur_file['DIR'], source_folder, target_folder)
            new_files.append(cur_file)

        with open(new_file, 'w') as out_file:
            json.dump({"FILE_LIST": new_files}, out_file, indent=2)

    except Exception:
        msg = 'Exception caught while repointing files JSON: "%s"' % filename
        logging.exception(msg)
        new_file = None

    return new_file


def _handle_missing_parameters(process_name: str, parameters: tuple, parameter_names: tuple):
    """Common missing parameter handler
    Arguments:
        process_name: the name to use for any messages
        params: a tuple of values to check
        parameter_names: the names of the prameters for any messages
    Exceptions:
        RuntimeError is raised if any of the parameters are None
    """
    missing_parameters = []
    parameter_name_len = len(parameter_names)

    for idx, value in enumerate(parameters):
        if value is None:
            missing_parameters.append(parameter_names[idx] if idx < parameter_name_len else 'Unknown_%d' % idx)

    if missing_parameters:
        msg = 'Missing required parameter(s) "' + '","'.join(missing_parameters) + '"" for ' + process_name
        logging.error(msg)
        raise RuntimeError(msg)


def _handle_missing_files(process_name: str, parameters: tuple, parameter_names: tuple):
    """Common missing file handler
    Arguments:
        process_name: the name to use for any messages
        params: a tuple of values to check
        parameter_names: the names of the prameters for any messages
    Exceptions:
        RuntimeError is raised if any of the parameters are None
    """
    invalid_parameters =  []
    invalid_values = []
    parameter_name_len = len(parameter_names)

    for idx, path in enumerate(parameters):
        if not os.path.exists(path) or not os.path.isfile(path):
            invalid_parameters.append(parameter_names[idx] if idx < parameter_name_len else 'Unknown_%d' % idx)
            invalid_values.append(path)

    if invalid_parameters:
        msg = 'Required files "' + ('","'.join(invalid_parameters)) + '" for ' + process_name + \
                ' are missing or are not files: "' + ('","'.join(invalid_values)) + '"'
        logging.error(msg,)
        raise RuntimeError(msg)


def _handle_missing_folders(process_name: str, parameters: tuple, parameter_names: tuple):
    """Common missing file handler
    Arguments:
        process_name: the name to use for any messages
        params: a tuple of values to check
        parameter_names: the names of the prameters for any messages
    Exceptions:
        RuntimeError is raised if any of the parameters are None
    """
    invalid_parameters =  []
    invalid_values = []
    parameter_name_len = len(parameter_names)

    for idx, path in enumerate(parameters):
        if not os.path.exists(path) or not os.path.isdir(path):
            invalid_parameters.append(parameter_names[idx] if idx < parameter_name_len else 'Unknown_%d' % idx)
            invalid_values.append(path)

    if invalid_parameters:
        msg = 'Required folders "' + ('","'.join(invalid_parameters)) + '" for ' + process_name + \
                ' are missing or are not folders: "' + ('","'.join(invalid_values)) + '"'
        logging.error(msg,)
        raise RuntimeError(msg)


def handle_soilmask(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> Optional[dict]:
    """Handle running the soilmask algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    # Find our arguments
    image_path, options = _find_parameter_values(parameters, ('image', 'options'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('soilmask', (image_path,), ('image',))
    _handle_missing_files('soilmask', (image_path,), ('image',))

    # Get the output masked file name
    cur_filename, cur_ext = os.path.splitext(os.path.basename(image_path))
    mask_filename = cur_filename + '_mask' + cur_ext

    # Write the JSON arguments to disk for the command
    json_args = {
        'SOILMASK_SOURCE_FILE': _replace_folder_path(image_path, input_folder, '/input'),
        'SOILMASK_MASK_FILE': mask_filename,
        'SOILMASK_WORKING_FOLDER': '/output',
        'SOILMASK_OPTIONS': options if options is not None else '',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('soilmask', input_folder, working_folder, json_file_path, msg_func, err_func)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_func)

    return command_results


def handle_soilmask_ratio(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> \
                            Optional[dict]:
    """Handle running the soilmask by ratio algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    # Find our arguments
    image_path, ratio, options = _find_parameter_values(parameters, ('image', '', 'options'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('soilmask ratio', (image_path,), ('image',))
    _handle_missing_files('soilmask ratio', (image_path,), ('image',))

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
        'SOILMASK_RATIO_OPTIONS': options if options is not None else '',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('soilmask_ratio', input_folder, working_folder, json_file_path, msg_func, err_func)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_func)

    return command_results


def handle_plotclip(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> Optional[dict]:
    """Handle running the plotclip algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    image_path, plot_geometries, options = _find_parameter_values(parameters, ('image','geometries','options'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('plotclip', (image_path, plot_geometries), ('image', 'plot_geometries'))
    _handle_missing_files('plotclip', (image_path, plot_geometries), ('image', 'plot_geometries'))

    # Write the arguments
    json_args = {
        'PLOTCLIP_SOURCE_FILE': _replace_folder_path(image_path, input_folder, '/input'),
        'PLOTCLIP_PLOTGEOMETRY_FILE': _replace_folder_path(plot_geometries, input_folder, '/input'),
        'PLOTCLIP_WORKING_FOLDER': '/output',
        'PLOTCLIP_OPTIONS': options if options is not None else '',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('plotclip', input_folder, working_folder, json_file_path, msg_func, err_func)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_func)
        command_results['file_name'] = os.path.basename(image_path)
        command_results['top_path'] = working_folder

    return command_results


def handle_find_files2json(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> \
                            Optional[dict]:
    """Handle running the file finding algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    search_name, search_folder = _find_parameter_values(parameters, ('file_name', 'top_path'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('find_files2json', (search_name, search_folder), ('file_name','top_path'))
    _handle_missing_folders('find_files2json', (search_folder,), ('top_path'))

    # Write the arguments
    json_args = {
        'FILES2JSON_SEARCH_NAME': search_name,
        'FILES2JSON_SEARCH_FOLDER': _replace_folder_path(search_folder, input_folder, '/input'),
        'FILES2JSON_JSON_FILE': '/output/found_files.json',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('find_files2json', input_folder, working_folder, json_file_path, msg_func, err_func)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_func)
        command_results['found_json_file'] = _replace_folder_path(json_args['FILES2JSON_JSON_FILE'], '/output', working_folder)
        command_results['results_search_folder'] = json_args['FILES2JSON_SEARCH_FOLDER']

    return command_results


def handle_canopycover(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> Optional[dict]:
    """Handle running the canopy cover algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    json_filename, experiment_file, search_folder, options = _find_parameter_values(parameters,
                                                        ('found_json_file', 'experimentdata', 'results_search_folder',  'options'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('canopycover', (json_filename,), ('found_json_file',))
    _handle_missing_files('canopycover', (json_filename,), ('found_json_file',))

    # Adjust the found files JSON to point to our output folder - making a best effort if search_folder is None
    new_json_filename = _repoint_files_json_dir(json_filename, search_folder, '/output', working_folder)
    if new_json_filename is None:
        new_json_filename = json_filename

    # Default our options
    if options is None:
        options = ''

    # Add in additional options
    if experiment_file is not None:
        if os.path.isfile(experiment_file):
            options += ' --metadata ' + _replace_folder_path(experiment_file, input_folder, '/input')
        else:
            msg = 'Warning: invalid experiment file specified for canopy cover "%s"' % experiment_file
            logging.warning(msg)
            msg_func((msg,), True)

    # Write the arguments
    json_args = {
        'CANOPYCOVER_OPTIONS': options if options is not None else '',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('canopycover', input_folder, working_folder, json_file_path, msg_func, err_func,
                             [[new_json_filename,'/scif/apps/src/canopy_cover_files.json']])

    command_results = None
    if ret_value == 0:
        command_results = {'results': _get_results_json(working_folder, err_func, True)}
        command_results['top_path'] = working_folder
        # TODO: change top_path to prev_working_folder everywhere and make that a default addition for substitution (magic value)

    return command_results


def handle_greenness_indices(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> \
                                Optional[dict]:
    """Handle running the greenenss algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    json_filename, experiment_file, search_folder, options = _find_parameter_values(parameters,
                                                        ('found_json_file', 'experimentdata', 'results_search_folder',  'options'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('greenness indices', (json_filename,), ('found_json_file',))
    _handle_missing_files('greenness indices', (json_filename,), ('found_json_file',))

    # Adjust the found files JSON to point to our output folder - making  a best effort if search_folder is None
    new_json_filename = _repoint_files_json_dir(json_filename, search_folder, '/output', working_folder)
    if new_json_filename is None:
        new_json_filename = json_filename

    # Default our options
    if options is None:
        options = ''

    # Add in additional options
    if experiment_file is not None:
        if os.path.isfile(experiment_file):
            options += ' --metadata ' + _replace_folder_path(experiment_file, input_folder, '/input')
        else:
            msg = "Warning: invalid experiment file specified for greenness indices"
            logging.warning(msg)
            msg_func((msg,), True)

    # Write the arguments
    json_args = {
        'GREENNESS_INDICES_OPTIONS': options if options is not None else '',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('canopycover', input_folder, working_folder, json_file_path, msg_func, err_func,
                             [[new_json_filename,'/scif/apps/src/greenness_indices_files.json']])

    command_results = None
    if ret_value == 0:
        command_results = {'results': _get_results_json(working_folder, err_func, True)}
        command_results['top_path'] = working_folder

    return command_results


def handle_merge_csv(parameters: tuple, input_folder: str, working_folder: str, msg_func: Callable, err_func: Callable) -> Optional[dict]:
    """Handle running the merging csv files algorithm
    Arguments:
        parameters: the specified parameters for the algorithm
        input_folder: the base folder where input files are located
        working_folder: the working folder for the algorithm
        msg_func: function to write messages to
        err_func: function to write errors to
    Return:
        A dictionary of addittional parameters to pass to the next command or None
    """
    search_folder, options = _find_parameter_values(parameters, ('top_path', 'options'))

    # Ensure we have our mandatory parameters
    _handle_missing_parameters('merge_csv', (search_folder,), ('top_path',))
    _handle_missing_folders('merge_csv', (search_folder,), ('top_path',))

    # Write the arguments
    json_args = {
        'MERGECSV_SOURCE': _replace_folder_path(search_folder, input_folder, '/input'),
        'MERGECSV_TARGET': '/output',
        'MERGECSV_OPTIONS': options if options is not None else '',
    }
    json_file_path = os.path.join(working_folder, 'args.json')
    _write_command_json(json_file_path, json_args)
    logging.debug("Command JSON: %s", str(json_args))

    # Run the command
    ret_value = _run_command('merge_csv', input_folder, working_folder, json_file_path, msg_func, err_func)

    command_results = None
    if ret_value == 0:
        command_results = _get_results_json(working_folder, err_func)

    return command_results
