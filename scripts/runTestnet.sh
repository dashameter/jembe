#!/usr/bin/env bash
source ~/.evoenv

export NUXT_DAPIADDRESSES='["34.220.41.134", "18.236.216.191", "54.191.227.118"]'
unset NUXT_DPNS_CONTRACT_ID
unset NUXT_LOCALNODE
unset NUXT_JEMBE_STAY_LOGGED_IN

export NUXT_ENV_RUN="testnet"

node ./scripts/registerContracts.js

source ./env/datacontracts_$NUXT_ENV_RUN.env

echo
echo "ENV VARS"
echo
printenv | grep NUXT
echo

nuxt --port 3341
