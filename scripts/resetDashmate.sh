
# Completely reset old docker data
# docker stop $(docker ps -aq); docker rm -f -v $(docker ps -a -q); docker volume prune -f; rm -rf ~/.dashmate/

# Setup new dashmate group for local development
# dashmate setup local

# or
./scripts/lib/dashmate_temporary_reset_script.sh

# Remove stale contractIds
rm env/registeredContracts_local.json 

 
# Fund service account to register contracts
# 'rival estate inside turn journey charge window rhythm marble audit amateur bus'
dashmate wallet:mint 10 --address=ySPRMNDVBhZVZvDS4wGn4Ujuq2wP4AcwLK --config=local_seed

# Fund testuser accounts
# Bob 'proud group frequent erase retire approve produce race wealth picnic alert pear'
dashmate wallet:mint 10 --address=yR5sQ16UZ3Rpni9bqueF81bsHTkJdioSgN --config=local_seed

# HoneyBadger 'sphere ozone bachelor raise clutch mercy mansion cook teach eager sleep gadget'
dashmate wallet:mint 10 --address=yTQousskoh6e2rGvThtYktzbqXc5MYuATF --config=local_seed

# 'legend chase bless great skirt street member push calm real menu flee'
dashmate wallet:mint 10 --address=yUwkuzCY9U5aLTTaEenf7jnnRK9LmXAQ2o --config=local_seed

# Start dashmate
dashmate group:start  --wait-for-readiness


echo "" >> ~/.evoenv
echo "export NUXT_DPNS_CONTRACT_ID=$(dashmate config:get platform.dpns.contract.id --config=local_1)" >> ~/.evoenv
echo "export VUE_APP_DPNS_CONTRACT_ID=$(dashmate config:get platform.dpns.contract.id --config=local_1)" >> ~/.evoenv
echo "export NUXT_DASHPAY_CONTRACT_ID=$(dashmate config:get platform.dashpay.contract.id --config=local_1)" >> ~/.evoenv
echo "export VUE_APP_DASHPAY_CONTRACT_ID=$(dashmate config:get platform.dashpay.contract.id --config=local_1)" >> ~/.evoenv
echo "export NUXT_DAPIADDRESSES='[\"127.0.0.1:3000\"]'" >> ~/.evoenv
echo "export VUE_APP_DAPIADDRESSES='[\"127.0.0.1:3000\"]'" >> ~/.evoenv
echo "export NUXT_MNEMONIC=\"rival estate inside turn journey charge window rhythm marble audit amateur bus\"" >> ~/.evoenv
echo "" >> ~/.evoenv


./scripts/registerTestUser.sh
