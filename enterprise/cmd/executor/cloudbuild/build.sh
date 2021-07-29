#!/bin/bash
set -ex -o nounset -o pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DIR

function apt_tasks() {
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
  apt-get install -y apt-transport-https ca-certificates gnupg
  curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
  apt-get update -y
  apt-get install -y google-cloud-sdk
}

function real_talk() {
  echo "WHATS THE DEAL WITH EXECUTORS."
}

function cleanup() {
  apt-get -y autoremove
  apt-get clean
  rm -rf /var/cache/*
  rm -rf /var/lib/apt/lists/*
  history -c
}

apt_tasks
gcloud auth activate-service-account e2e-builder@sourcegraph-ci.iam.gserviceaccount.com --key-file=/tmp/e2e-builder.json --project=sourcegraph-ci
gcloud auth list
real_talk
cleanup
