#!/usr/bin/env python3
"""Sccript to generating a JavaScript workflow definitions file from the Python configuration"""

import argparse
import json
import logging
import os
import sys
from typing import Union

from workflow_definitions import WORKFLOW_DEFINITIONS


def _write_out_js(definition, prefix: str = None, postfix: str = None, indent: Union[int, str, None] = None):
    """Handles the details of writing the defintion as Javascript
    Arguments:
        definition: the definition to write
        prefix: string to write before writing the definition
        postfix: string to write before writing the definition
        indent: a count of spaces to indent, or a string to use for indentation
    Notes:
        If a string is used for indentation, that string is repeated
    """
    if prefix is not None:
        print(prefix, end='')

    print(json.dumps(definition, indent = indent), end='')

    if postfix is not None:
        print(postfix, end='')


def _parse_args() -> tuple:
    """Parse the command line arguments
    Returns:
        Returns a tuple containing the source file and output file paths
    """
    parser = argparse.ArgumentParser(description='Convert workflow definition to JavaScript')
    parser.add_argument('-output', help='write the output to the specified file instead of to the display')
    parser.add_argument('-debug', action='store_const', default=logging.WARN, const=logging.DEBUG,
                        help='enable debug logging (default=WARN)')
    parser.add_argument('-info', action='store_const', default=logging.WARN, const=logging.INFO,
                        help='enable info logging (default=WARN)')

    args =  parser.parse_args()

    # Figure out the remaining parameters to return
    logging_level = args.debug if args.debug == logging.DEBUG else args.info

    return args.output, logging_level


def generate_workflow_def():
    """Generates the workflow definition file for JavaScript
    """
    result_file, logging_level = _parse_args()

    logging.getLogger().setLevel(logging_level)

    # Remove an existing output file and open it for  writing
    if result_file is not None:
        if os.path.exists(result_file):
            os.unlink(result_file)
        sys.stdout = open(result_file, 'w')

    # Generate the JavaScript
    _write_out_js(WORKFLOW_DEFINITIONS,
                  prefix = 'var workflowDefinitions = ',
                  postfix = ';\n\nexport default workflowDefinitions;',
                  indent = 2)

    sys.stdout = sys.__stdout__


if __name__ == "__main__":
    generate_workflow_def()
