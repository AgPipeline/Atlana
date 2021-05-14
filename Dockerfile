
# Allow overrides of base version we build from
ARG BASE_IMAGE_VERSION=1.1
ARG BASE_IMAGE=agdrone/drone-workflow:${BASE_IMAGE_VERSION}

# Build our basic install
FROM node:current-alpine as build

WORKDIR /app/react_frontend

# Copy files to where we want them
COPY ./public/production_scripts.js ./public/additional_scripts.js
COPY ./package.json ./
COPY ./package-lock.json ./

RUN echo ${BASE_IMAGE}

# Run the build
RUN npm ci
COPY ./ ./
RUN npm run build

FROM ${BASE_IMAGE}

# Allow port number overrides
ARG PORT_NUMBER=3000

WORKDIR /web_site

RUN python3 -m pip install --upgrade --no-cache-dir pip

RUN python3 -m pip install --upgrade --no-cache-dir \
        gunicorn

# Copy the build
COPY --from=build /app/react_frontend/build/* ./

COPY ./*.py ./
COPY ./*.sh ./

COPY ./test_data ./

EXPOSE ${PORT_NUMBER}

ENV PYTHONPATH="${PYTHONPATH}:/app/react_frontend"  \
    SERVER_DIR="/app/flask_backend" \
    WEB_SITE_URL="0.0.0.0:"${PORT_NUMBER}

ENTRYPOINT gunicorn -w 4 -b ${WEB_SITE_URL} --access-logfile '-' main:app
