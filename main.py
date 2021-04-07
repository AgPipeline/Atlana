"""Server side API"""

import json
import os
import fnmatch
#from osgeo import gdal, osr
#from PIL import Image
#from flask import Flask, request, send_file, make_response, render_template
from flask import Flask
from flask_cors import cross_origin
#from werkzeug.utils import secure_filename

app = Flask(__name__)

FILE_START_PATH = os.path.abspath(os.path.dirname(__file__))


@app.route('/server/files', methods=['GET'])
@cross_origin()
def files(path: str, file_filter:  str) -> tuple:
    """Handles listing folder contents
    Arguments:
        path: the relative path to list
        file_filter: the filter to apply to the returned names
    """
    return_names = []

    cur_path = os.path.abspath(os.path.join(FILE_START_PATH, path))
    if not cur_path.startswith(FILE_START_PATH):
        print('Invalid path requested: "%s"' % path, flush=True)
        return 'Resource not found', 400

    for one_file in os.listdir(cur_path):
        file_path = os.path.join(cur_path, one_file)
        if not one_file[0] == '.' and (not file_filter or (file_filter and fnmatch.fnmatch(one_file, file_filter))):
            return_names.append({'name': one_file,
                                 'path': file_path,
                                 'type': 'folder' if os.path.isdir(file_path) else 'file'
                                 })

    return json.dumps(return_names)


if __name__ == '__main__':
    app.run(debug=False)
