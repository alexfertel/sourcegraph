#!/usr/bin/env bash

set -ex
cd "$(dirname "${BASH_SOURCE[0]}")"

# This image is identical to our "sourcegraph/postgres-12.6" image.
IMAGE="${IMAGE:-sourcegraph/codeintel-db}" ../postgres-12.6/build.sh
