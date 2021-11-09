#!/bin/bash -e


cd "$(dirname ${BASH_SOURCE[0]})/.."


export DOCUMENT_CONTENT="$(cat "$1")"

export INTERFACE_STACK="InterfaceStack"

export API_ENDPOINT_URL=$(aws cloudformation describe-stacks --stack-name $INTERFACE_STACK --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpointUrl`].OutputValue' --output text)
export API_DOCUMENTS_URL="${API_ENDPOINT_URL}documents"

export API_WRITER_TOKEN_SECRET_ID=$(aws cloudformation describe-stacks --stack-name $INTERFACE_STACK --query 'Stacks[0].Outputs[?OutputKey==`WriterTokenName`].OutputValue' --output text)
export API_WRITER_TOKEN=$(aws secretsmanager get-secret-value --secret-id $API_WRITER_TOKEN_SECRET_ID --query 'SecretString' --output text)


curl -X POST --header "Authorization:$API_WRITER_TOKEN" --data "$DOCUMENT_CONTENT" "$API_DOCUMENTS_URL"