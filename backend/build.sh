#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install PortAudio (for PyAudio) AND FFmpeg (for reading browser audio)
sudo apt-get update && sudo apt-get install -y portaudio19-dev ffmpeg

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt