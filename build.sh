#!/bin/sh

gittag="$(git describe --abbrev=0 | tr -d v)"
branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" == "master" ]; then
    version="${gittag}"
else
    version="${gittag}-${branch}"
fi

tag="quay.io/rh-jmc-team/container-jfr-web:${version}"

echo "Building to ${tag}..."

docker build . -t "${tag}"
