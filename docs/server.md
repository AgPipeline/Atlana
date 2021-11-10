# Running the Server

The web site uses a combination of [npm](https://www.npmjs.com/) and [Flask](https://flask.palletsprojects.com/en/2.0.x/) for development.
For the production [Docker image](https://hub.docker.com/r/agdrone/workflow_web_ui/tags?page=1&ordering=last_updated), a combination of npm and [gunicorn](https://gunicorn.org/) on Ubuntu is used.

## Startup Configuration

When the Python web server starts, either using Flask or by running a Docker image, there are Environment Variables that are checked which may provide additional features.

**MORE_FOLDERS**

This environment variable can be used to allow users to access additional folders on the system.
By default each user has access to their own location on the server's file system in which they can upload files.
The use of this environment variable allows users to access a common location on the sytem.
When running a Docker image, mounted volumes can be made accessible through this feature (see Docker Image below for an example).

This variable consists of one or more unique name with it's associated folder path as a pair.
The name and path of each pair is separated by a colon (`:`).
Each pair is separated from any other through a semi-colon (`;`).
The users will only see the name and not the actual path.

The following example shows how two separate folders might be defined.
The names of the folders are `test` and `production`; this is what the user will see.
```bash
MORE_FOLDERS="test:/data/testing_files;production:/data/production"
```

## Docker Image

The [Docker](https://docs.docker.com/engine/reference/run/) image can be run using the following command:

```bash
docker run --rm -p 5000:3000 -d agdrone/workflow_web_ui:1.1
````

This command can be broken down as follows:
- `docker run` - instructs the docker application to run an image
- `--rm` - the [Docker container](https://dockerlabs.collabnix.com/beginners/components/container-vs-image.html) will be automatically deleted when it finished
- `-p 5000:3000` - maps the machine's port 5000 to the Docker container's port 3000
- `-d` - runs the container in detached mode; the container will continue to run after you're logged out
- `agdrone/workflow_web_ui:1.1` - the name of the Docker image to run

Once the container is running, you can access the web site by browsing to http://<your host>:5000 (using the example given).
If you have specified a different port (something other than 5000), you will need to use that port number.

It's important to mount any needed volumes when defining the *MORE_FOLDERS* environment variable for the Docker container.

Applying the example definition of *MORE_FOLDERS* as defined above to the Docker command, we could use the following:

```bash
docker run --rm -p 5000:3000 -d -v /path/to/data:/data -e "MORE_FOLDERS=test:/data/testing_files;production:/data/production" agdrone/workflow_web_ui:1.1
```

The additional parameters on the command are:
- `-v /path/to/data:/data` - mounts the folder specified by "/path/to/data" to the "/data" folder in the running container; you would replace the "/path/to/data" with what's meaningful on your system
- `-e "MORE_FOLDERS=test:/data/testing_files;production:/data/production"` - defines the "MORE_FOLDERS" environment variable in the running Docker container

## Command Line

This example assumes the source code has been retrieved from [GitHub](https://github.com/AgPipeline/Atlana).

### npm

Be sure to install the npm packages the web site needs before starting npm.

The following command starts the npm front end:
```bash
npm start
```

## Flask

The use of the [miniconda](https://docs.conda.io/en/latest/miniconda.html) environment is recommended for running this site.

Install the Flask module:
```bash
python3 -m pip install flask
```

Additional Python dependencies can be found in the [requirements.txt](https://github.com/AgPipeline/Atlana/blob/main/requirements.txt) file.

**NOTE:** The `gunicorn` dependency is not needed since we're running Flask.

Assuming a miniconda environment, the command for starting the Flask server follows:
```bash
. venv/bin/activate && FLASK_APP=main.py python3 -m flask run
```

This command can be broken down as follows:
- `. venv/bin/activate` - activates the minicona environment
- `&&` - [shell command list](https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Lists) `AND` control operator
- `FLASK_APP=main.py` - environment variable used by Flask to identify the script to run
- `python3 -m flask` - Python3 command to run the Flask module
- `run` - command line argument passed to the Flask module; tells Flask to run the script

When using the **MORE_FOLDERS** environment variable, it can just be added to the command line as shown:
```bash
. venv/bin/activate && MORE_FOLDERS="test:/data/testing_files;production:/data/production" FLASK_APP=main.py python3 -m flask run
```
