#!/bin/bash

set -e

UNIQUE=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)

### Config

# Locust test details. How many clients to simulate, etc.
# LOCUST_WORKER_COUNT and "--expect-slaves" must be the same
LOCUST_TARGET_HOST=""
LOCUST_MASTER_CONFIG="--no-web --expect-slaves 10 --clients 100 --hatch-rate 10 --run-time 1m --csv /locust-results/results --loglevel INFO"
LOCUST_WORKER_COUNT=10

# Service principal 
CLIENT_ID=
CLIENT_SECRET=

# Azure subscription details
LOCATION=
RESOURCE_GROUP=

# How big do you want the AKS cluster?
AKS_NAME=loadtest$UNIQUE
AKS_NODE_COUNT=2
AKS_NODE_VM_SKU="Standard_D2s_v3"
KUBERNETES_VERSION=1.16.8

# Temporary file storage
STORAGE_ACCOUNT_NAME=loadtest$UNIQUE
TEST_FILESHARE_NAME=locust-tasks
RESULTS_FILESHARE_NAME=locust-results
LOCAL_RESULTS_PATH="../results/$(date +"%Y%m%d-%H%M%S")"

### Create and run

# Create AKS Cluster
echo "Creating AKS Cluster"
az aks create --name $AKS_NAME \
     --resource-group $RESOURCE_GROUP \
     --kubernetes-version $KUBERNETES_VERSION --location $LOCATION \
     --service-principal $CLIENT_ID \
     --client-secret $CLIENT_SECRET \
     --nodepool-name linux --node-count $AKS_NODE_COUNT --node-vm-size $AKS_NODE_VM_SKU \
     --load-balancer-sku standard --vm-set-type VirtualMachineScaleSets \
     --network-plugin azure --network-policy azure --no-wait

# Create Storage Account
az storage account create -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT_NAME -l $LOCATION \
  --kind StorageV2 --sku Standard_LRS --default-action Allow 
STORAGE_ACCOUNT_KEY=$(az storage account keys list -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT_NAME --query "[0].value" -o tsv)

# Create File Shares
az storage share create --account-name $STORAGE_ACCOUNT_NAME --account-key $STORAGE_ACCOUNT_KEY --name $TEST_FILESHARE_NAME --quota 1024
az storage copy --source-local-path ../tests --recursive --destination-account-name $STORAGE_ACCOUNT_NAME --destination-share $TEST_FILESHARE_NAME
az storage share create --account-name $STORAGE_ACCOUNT_NAME --account-key $STORAGE_ACCOUNT_KEY --name $RESULTS_FILESHARE_NAME --quota 1024

# Obtain AKS Cluster credentials once AKS cluster is provisioned
is_aks_provisioned() {
  provisioned=0
  if [ "$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_NAME --query "provisioningState" -o tsv)" == "Succeeded" ]; then 
    provisioned=1
  fi
  echo $provisioned
}
while [ $(is_aks_provisioned) == 0 ]; do
  echo "[$(date)]: Waiting for AKS cluster provisioning ..."
  sleep 10
done
echo "$(date): AKS cluster provisioned"
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME \
  --overwrite-existing -f ./$AKS_NAME.config

# Create loadtest namespace in AKS Cluster
kubectl --kubeconfig ./$AKS_NAME.config create namespace loadtest

# Deploy locust to AKS Cluster and run tests
helm install locust --kubeconfig ./$AKS_NAME.config --namespace loadtest ../chart/locust -f ../chart/locust/values.yaml \
  --set azureFile.storage.name=$STORAGE_ACCOUNT_NAME \
  --set azureFile.storage.key=$STORAGE_ACCOUNT_KEY \
  --set azureFile.shares.test=$TEST_FILESHARE_NAME \
  --set azureFile.shares.results=$RESULTS_FILESHARE_NAME \
  --set locust.targetHost=$LOCUST_TARGET_HOST \
  --set master.config.locustOpts="$LOCUST_MASTER_CONFIG" \
  --set worker.replicaCount=$LOCUST_WORKER_COUNT

# Wait until tests have completed and copy out results
have_tests_completed() {
  completed=0
  if [ "$(kubectl get job locust-worker --namespace loadtest --kubeconfig ./$AKS_NAME.config -o jsonpath='{.status.succeeded}')" == $LOCUST_WORKER_COUNT ]; then 
    completed=1
  fi
  echo $completed
}
while [ $(have_tests_completed) == 0 ]; do
  echo "[$(date)]: Tests running ..."
  sleep 10
done
echo "$(date): Tests complete"

mkdir -p $LOCAL_RESULTS_PATH
az storage copy --source-account-name $STORAGE_ACCOUNT_NAME --source-share $RESULTS_FILESHARE_NAME --recursive \
  --include-pattern '*.csv' --destination-local-path $LOCAL_RESULTS_PATH
echo "Tests are available in $LOCAL_RESULTS_PATH"

###  Destroy test infrastructure  ###
rm ./$AKS_NAME.config

az aks delete --name $AKS_NAME --resource-group $RESOURCE_GROUP --yes --no-wait
az storage account delete --name $STORAGE_ACCOUNT_NAME --yes
