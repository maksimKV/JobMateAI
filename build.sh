#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install system dependencies
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    apt-get update && apt-get install -y --no-install-recommends \
        libmagic1 \
        && rm -rf /var/lib/apt/lists/*
elif [ -f /etc/redhat-release ]; then
    # CentOS/RHEL
    yum install -y file-devel
fi

# Install Python dependencies
pip install -r backend/requirements.txt
