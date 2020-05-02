#!/usr/bin/env bash

read -r -d '' HELPSTRING <<EOF
usage: setup_terraform_s3dynamodb_backend.sh <args...>

args:
    -h/--help:                 display this help message
    -n/--new <projectname>:    make terraform s3/dynamodb backend for project
                               if it doesn't exist
    -d/--delete <projectname>: delete terraform s3/dynamodb backend for project
                               if it exists
EOF

DEFAULT_PROJECTNAME="northernlights-vision"
if [ -z "${2}" ]; then 2="${DEFAULT_PROJECTNAME}"; fi # default projectname
BUCKETNAME="tfstate-s3-${2}"                          # s3
TABLENAME="tfstate-dynamodb-${2}"                     # dynamodb

eval_commands() {
    for COMMAND_NAME in "${@}"; do
        eval "${COMMAND_NAME}"
    done
}

if [[ -z "${1}" || "${1}" == "-h" || "${1}" == "--help" ]]; then
    echo "$HELPSTRING"
    exit 0

elif [[ -n "${2}" && ( "${1}" == "-n" || "${1}" == "--new" ) ]]; then
    MAKE_BUCKET_COMMAND="aws s3 mb s3://${BUCKETNAME} && "
    MAKE_BUCKET_COMMAND+="aws s3api put-bucket-versioning --bucket s3://${BUCKETNAME} "
    MAKE_BUCKET_COMMAND+="--versioning-configuration Status=Enabled"

    MAKE_TABLE_COMMAND="aws dynamodb create-table --table ${TABLENAME} "
    MAKE_TABLE_COMMAND="--attribute-definitions AttributeName=LockID,AttributeType=S "
    MAKE_TABLE_COMMAND+="--key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST"

    eval_commands "${MAKE_BUCKET_COMMAND}" "${MAKE_TABLE_COMMAND}"

elif [[ -n "${2}" && ( "${1}" == "-d" || "${1}" == "--delete" ) ]]; then
    REMOVE_BUCKET_COMMAND="aws s3 rb s3://${BUCKETNAME}"
    REMOVE_TABLE_COMMAND="aws dynamodb delete-table --table ${TABLENAME}"

    eval_commands "${REMOVE_BUCKET_COMMAND}" "${REMOVE_TABLE_COMMAND}"

else
    echo "$HELPSTING"
    echo 1
fi
