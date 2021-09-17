#!/usr/bin/env python3
"""Simple workflow runner"""

import os
import argparse
import json
import random
import time
import shutil
from typing import Optional
from collections.abc import Callable
import logging

if 'ATLANA_USE_SCIF_WORKFLOW' in os.environ:
    import workflow_scif as wd
else:
    import workflow_docker as wd

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
    def __handle_exception(msg: str, ex) -> None:
        """Scoped function to handle exception printing
        Arguments:
            msg - the exception message
            ex - the exception
        """
        if logging.getLogger().level == logging.DEBUG:
            logging.exception(msg)
        else:
            logging.warning(msg)
            logging.warning(ex)


    # Start of regular function
    if not os.path.isdir(top_folder):
        msg = f'Setup working folder: top level folder is not a valid directory "{top_folder}"'
        logging.error(msg)
        raise RuntimeError(msg)

    working_folder = os.path.join(top_folder, subfolder)

    # If our folder doesn't exist, try to create it. Otherwise, clean it up
    if not os.path.isdir(working_folder):
        try:
            os.mkdir(working_folder)
        except Exception as ex:
            __handle_exception(f'Exception caught while creating command working folder "{top_folder}"', ex)
            raise RuntimeError(msg) from ex
    else:
        for one_name in os.listdir(working_folder):
            cur_path = os.path.join(working_folder, one_name)
            try:
                if not os.path.isdir(cur_path):
                    os.unlink(cur_path)
                else:
                    shutil.rmtree(cur_path)
            # Ignore exceptions
            except OSError as ex:
                __handle_exception(f'OSError exception caught while cleaning file/folder "{cur_path}"' + '\n' + \
                                            f'... ignoring exception and continuing cleanup of folder "{working_folder}"', ex)
            except Exception as ex:
                __handle_exception(f'Unknown exception caught while cleaning file/folder "{cur_path}"' + '\n' + \
                                            f'... ignoring exception and continuing cleanup of folder "{working_folder}"', ex)

    return working_folder


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
        with open(filename, 'r', encoding='utf8') as in_file:
            result = json.load(in_file)
    except json.JSONDecodeError as ex:
        msg = f'A JSON decode error was caught while loading JSON file "{filename}"'
        logging.exception(msg)
        if error_func:
            error_func((msg, str(ex)))
    except Exception as ex:
        msg = f'An unknown exception was caught while loading JSON file "{filename}"'
        logging.exception(msg)
        if error_func:
            error_func((msg, str(ex)))

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
            opened_file = open(filename, mode, encoding='utf8')
        except OSError:
            msg = f'Exception opening log file "{filename}" for writing "{mode}"'
            logging.exception(msg)
        except Exception:
            msg = f'Unknown exception opening log file "{filename}" for writing "{mode}"'
            logging.exception(msg)

        # Check for success
        if opened_file is not None:
            break

        # Back off and wait before trying again
        sleep_time = WRITING_LOG_RETRY_BACKOFFS[try_count] if try_count < len(WRITING_LOG_RETRY_BACKOFFS) else \
                                    random.uniform(WRITING_LOG_RETRY_RAND_MIN, WRITING_LOG_RETRY_RAND_MAX)

        logging.debug('Sleeping before retrying open: %s seconds', str(sleep_time))
        time.sleep(sleep_time)

    if opened_file is None:
        msg = f'Unable to open log file "{filename}" for writing "{mode}"'
        logging.warning(msg)
        return return_value

    try:
        for one_line in lines:
            opened_file.write(one_line)
        return_value = True
    except Exception:
        msg = f'Exception caught while writing to log file "{filename}"'
        logging.exception(msg)
    finally:
        opened_file.close()

    # Return the result
    return return_value


def parse_args() -> tuple:
    """Parses the command line arguments
    Return:
        A tuple containing the command line arguments
    """
    parser = argparse.ArgumentParser(description='Processes a command queue')
    parser.add_argument('workdir', help='the working folder containing the queued commands to execute')
    parser.add_argument('-debug', action='store_const', default=logging.WARN, const=logging.DEBUG,
                        help='enable debug logging (default=WARN)')
    parser.add_argument('-info', action='store_const', default=logging.WARN, const=logging.INFO,
                        help='enable info logging (default=WARN)')

    args =  parser.parse_args()

    if not args.workdir or not os.path.exists(args.workdir):
        raise RuntimeError(f'Invalid or missing folder specified "{args.workdir}"')

    workflow_folder = args.workdir
    if os.path.isdir(workflow_folder):
        workflow_file = os.path.join(workflow_folder, QUEUE_FILE_NAME)
    else:
        workflow_file = workflow_folder
        workflow_folder = os.path.dirname(workflow_folder)

    logging_level = args.debug if args.debug == logging.DEBUG else args.info

    return workflow_folder, workflow_file, logging_level


def write_error(filename: str, messages: tuple, exception: Exception=None):
    """Writes the error message to the error file
    Arguments:
        filename: the name of the file to write to
        messages: a tuple of messages to write to the file - each element is cast to a string before writing
        exception: an optional exception associated with the error
    """
    if exception is not None:
        _ = _write_log_file(filename, messages + (str(exception)))
    else:
        _ = _write_log_file(filename, messages)


def write_status(filename: str, status: str, message: object):
    """Writes the status message to the status file
    Arguments:
        filename: the name of the file to write to
        status: the status to write to the file
        message: the message associated with the status
    """
    lines = (json.dumps({status: message}, indent=2),)
    logging.info('Current status: %s', str(lines))
    _ = _write_log_file(filename, lines, append=False)


def prepare_prev_results(parameters: list, res: dict) -> list:
    """Incorporates the previous results into the current parameters, when applicable
    Arguments:
        parameters: the list of parameters
        res: the results to incorporate
y referenced files to
    Returns:
        The list of adjusted parameters
    """
    # pylint: disable=too-many-nested-blocks
    adjusted = []
    for one_parameter in parameters:
        cur_param = {**one_parameter}
        if 'prev_command_path' in cur_param:
            # Try to find what they're looking for
            result_parts = cur_param['prev_command_path'].split(':')
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
                            logging.warning('Invalid index specified for previous result value %s %s',
                                            str(cur_param['prev_command_path']), str(working_res))
                            missing_part = True
                            break
                    except ValueError:
                        logging.exception('Invalid index value "%s" specified for previous result value "%s"',
                                                one_part, cur_param['prev_command_path'])
                        missing_part = True
                        break
                else:
                    missing_part = True
                    break

            # Add the adjusted parameter. We don't throw an error here since we don't know if a missing
            # value is important or not
            if missing_part:
                logging.error('Unable to find previous result value "%s" %s', str(one_parameter['prev_command_path']), str(res))

            cur_param['value'] = working_res if missing_part is False else None

        adjusted.append(cur_param)

    return adjusted


def run_workflow():
    """ Runs the workflow passed in on the command line"""
    working_folder, workflow_file, logging_level = parse_args()

    logging.getLogger().setLevel(logging_level)

    status_filename = os.path.join(working_folder, STATUS_FILE_NAME)
    message_filename = os.path.join(working_folder, STDOUT_FILE_NAME)
    message_func = lambda msg, append: _write_log_file(message_filename, msg, append)
    error_filename = os.path.join(working_folder, STDERR_FILE_NAME)
    error_func = lambda msg, append: _write_log_file(error_filename, msg, append)

    # Clean up from a previous run if necessary
    for file_name in [status_filename, message_filename, error_filename]:
        logging.debug('Cleaning up previous logging file "%s"', file_name)
        if os.path.exists(file_name):
            os.unlink(file_name)

    # Indicate our status
    write_status(status_filename, STATUS_STARTING, {'message': 'Preparing workflow'})

    # Load our commands
    commands = _load_json_file(workflow_file, error_func)
    if commands is None:
        write_status(status_filename, STATUS_COMPLETED, {'error': 'Unable to start workflow'})
        logging.error('Unable to load workflow from file  "%s"', workflow_file)
        return

    if not commands:
        msg = 'No commands were found to execute'
        write_status(status_filename, STATUS_COMPLETED, {'message': msg})
        logging.error('Empty workflow loaded from file  "%s"', workflow_file)
        return

    #  Process the commands
    command_map = wd.get_command_map()
    res = None
    wrote_final_status = False
    for one_command in commands:
        command_name = one_command['command']
        command_working_folder = _setup_working_folder(working_folder, command_name)
        logging.debug("Incorporating previous results: %s", str(res))
        parameters = prepare_prev_results(one_command['parameters'], res)
        logging.info('Running command %s', str(command_name))
        write_status(status_filename, STATUS_RUNNING, {'message': 'Running ' + command_name})
        if 'git' in command_map and 'git_repo' in one_command and 'git_branch' in one_command:
            res = command_map['git'](one_command['git_repo'], one_command['git_branch'], parameters, working_folder, command_working_folder,
                                     message_func, error_func)
        elif command_name in command_map:
            res = command_map[command_name](parameters, working_folder, command_working_folder, message_func, error_func)
        else:
            msg = f'Unknown command found "{command_name}"'
            write_status(status_filename, STATUS_COMPLETED, {'error': msg})
            wrote_final_status = True
            logging.error('Unknown workflow command found from file  "%s"', workflow_file)
            break

    #  If we haven't written out final status yet, do so now
    if wrote_final_status is False:
        write_status(status_filename, STATUS_COMPLETED, {'message': 'Completed'})
        logging.debug('Completed running workflow "%s"', workflow_file)


if __name__ == "__main__":
    run_workflow()
