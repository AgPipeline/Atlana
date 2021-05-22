
# Allow overrides of base version we build from
ARG BASE_IMAGE_VERSION=1.1
ARG BASE_IMAGE=agdrone/drone-workflow:${BASE_IMAGE_VERSION}

# Build our basic install
FROM node:current-alpine as build

WORKDIR /app/react_frontend

# Prepare for the build
COPY ./package.json ./
COPY ./package-lock.json ./

RUN echo ${BASE_IMAGE}

# Run the build
RUN npm ci

# Copy other files where we want them
COPY ./public ./public
COPY ./src ./src
COPY ./public/production_scripts.js ./public/additional_scripts.js
COPY ./src/ProductionUtils.js ./src/Utils.js

RUN npm run build

FROM ${BASE_IMAGE}

WORKDIR /web_site

# Allow Session secret key override
ARG SECRET_KEY=

# Allow port number overrides
ARG PORT_NUMBER=3000

# Set upload/working data folder
ARG WORKING_FOLDER=/web_site/uploads
RUN mkdir ${WORKING_FOLDER} && chmod 777 ${WORKING_FOLDER}

# Setup workflow file folder
ARG WORKFLOW_FOLDER=/web_site/workflow
RUN mkdir ${WORKFLOW_FOLDER} && chmod 777 ${WORKFLOW_FOLDER}

# Copy the build
COPY --from=build /app/react_frontend/build/* ./

# Install requirements
COPY ./requirements.txt ./
RUN python3 -m pip install --upgrade --no-cache-dir pip
RUN python3 -m pip install --upgrade --no-cache-dir -r requirements.txt

# Copy files to where we want them
RUN mkdir templates && mv index.html templates/
COPY ./*.py ./*.sh ./
COPY ./test_data ./test_data

EXPOSE ${PORT_NUMBER}

ENV PYTHONPATH="${PYTHONPATH}:/app/react_frontend"  \
    SERVER_DIR="/app/flask_backend" \
    WEB_SITE_URL="0.0.0.0:"${PORT_NUMBER} \
    WORKING_FOLDER=$WORKING_FOLDER \
    WORKFLOW_FOLDER=$WORKFLOW_FOLDER \
    SECRET_KEY=$SECRET_KEY \
    ATLANA_USE_SCIF_WORKFLOW= 

ENTRYPOINT gunicorn -w 4 -b ${WEB_SITE_URL} --access-logfile '-' main:app
