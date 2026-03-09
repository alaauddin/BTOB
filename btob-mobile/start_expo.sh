#!/bin/bash
source ~/.nvm/nvm.sh
npm run start > expo_out.log 2>&1 &
echo "Started Expo. Process ID: $!"
