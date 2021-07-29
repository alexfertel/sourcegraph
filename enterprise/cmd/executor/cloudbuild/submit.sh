#!/usr/bin/env bash

# This script submits a packer build for the executor bare-metal image.

cd "$(dirname "${BASH_SOURCE[0]}")"
set -eu

cat <<EOF >cloudbuild.yaml
steps:
  - name: gcr.io/cloud-builders/gcloud
    entrypoint: bash
    args: ['-c', 'gcloud secrets versions access latest --secret=e2e-builder-sa-key --quiet --project=sourcegraph-ci > /workspace/builder-sa-key.json']
  - name: index.docker.io/hashicorp/packer:1.6.6
    env:
      - PACKER_LOG=1
      - VERSION=$(git log -n1 --pretty=format:%h)
    args: ['build', 'executor.json']
EOF

function cleanup() {
  rm -f cloudbuild.yaml
}
trap cleanup EXIT

# TODO - not ./, only the build dir
gcloud builds submit --config=./cloudbuild.yaml ./ --project="sourcegraph-ci"
