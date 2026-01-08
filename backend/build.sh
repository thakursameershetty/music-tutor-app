#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install PortAudio (Required for PyAudio)
sudo apt-get update && sudo apt-get install -y portaudio19-dev

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt