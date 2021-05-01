#!/usr/bin/env python3
"""Simple workflow runner"""

import os
import argparse
import json
import random
import time
# TODO: logging

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
        mode = 'wa'

    # Try really hard to write to the file
    for try_count in range(0, WRITING_LOG_RETRY_COUNT):
        try:
            opened_file = open(filename, mode)
        except OSError as ex:
            msg = 'Exception opening log file "%s" for writing "%s"' % (filename, mode)
            print(msg, ex)
        except Exception as ex:
            msg = 'Unknown exception opening log file "%s" for writing "%s"' % (filename, mode)
            print(msg, ex)

        # Check for success
        if opened_file is not None:
            break;

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
            opened_file.write(one_line + '\n')
        return_value = True
    except Exception as ex:
        msg = 'Exception caught while writing to log file "%s"' % filename
        print(msg, ex)
    finally:
        opened_file.close()

    # Return the result
    return return_value


def parse_args() -> tuple:
    """Parses the command line arguments
    Return:
        A tuple containing the command line arguments
    """
    # TODO: logging support
    parser = argparse.ArgumentParser(description='Processes a command queue')
    parser.add_arguments('workdir', required=True, help='the working folder containing the queued commands to execute')

    args =  parser.parse_args()

    if not args['workdir'] or not os.path.exists(args['workdir']):
        raise RuntimeError('Invalid or missing folder specified "%s"' % args['workdir'])

    workflow_folder = args['workflow']
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
    # TODO: write to logging on error
   _ = _write_log_file(filename, messages + str(exception))


def write_status(filename: str, status: str, message: object):
    """Writes the status message to the status file
    Arguments:
        filename: the name of the file to write to
        status: the status to write to the file
        message: the message associated with the status
    """
    # TODO: write to logging on error
    _ = _write_log_file(filename, json.dumps({status: message}, indent=2), append=False)


def run_workflow():
    """ Runs the workflow passed in on the command line"""
    working_folder, workflow_file = parse_args()

    status_filename = os.path.join(working_folder, STATUS_FILE_NAME)
    message_filename = os.path.join(working_folder, STDOUT_FILE_NAME)
    error_filename = os.path.join(working_folder, STDERR_FILE_NAME)

    write_status(STATUS_MSG_STARTING, {'message': 'Preparing workflow'})

    commands = None
    try:
        with open(workflow_file, 'r') as in_file:
            commands = json.load(in_file)
    except json.JSONDecodeError as ex:
        msg = 'A JSON decode error was caught while loading workflow'
        print(msg, ex)
        write_error(error_filename, (msg), ex)
        write_status(status_filename, STATUS_COMPLETED, {'error': 'Unable to start workflow'})
    except Exception as ex:
        msg = 'An unknown exception was caught while loading workflow'
        print(msg, ex)
        write_error(error_filename, (msg), ex)
        write_status(status_filename, STATUS_COMPLETED, {'error': 'Unable to start workflow'})

    if commands is None:
        return

    #  Process the commands


if __name__ == "__main__":
    run_workflow()