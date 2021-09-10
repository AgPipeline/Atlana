#!/bin/bash

if [[ "${1}" == "" ]]; then
  NUM_LINES=100
else
  NUM_LINES=${1}
fi

sleep 1

for ((i=1; i<=NUM_LINES; i++)); do
   echo "Generated line $i"
done
