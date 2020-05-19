# Deploying the environment using teraform

## Prerequisites
- Terraform
- Node 12
- Azure CLI
- Azure functions CLI v3

This project includes a [dev container](https://code.visualstudio.com/docs/remote/containers), with the prerequisites installed.

### Install terraform 
Download the latest binary for your platform from [here](https://www.terraform.io/downloads.html)

On Debian \ Ubuntu:

```bash
sudo apt-get install unzip
wget https://releases.hashicorp.com/terraform/0.12.25/terraform_0.12.25_linux_amd64.zip
unzip terraform_0.12.25_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```
### Install Node 12
Use nvm (Node Version Manager) as described [here](https://nodejs.org/en/download/package-manager/#nvm) 

On Debian \ Ubuntu:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
nvm install lts/erbium
```

### Install Azure CLI
Follow the instructions here [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)

On Debian \ Ubuntu:

As described [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-apt?view=azure-cli-latest): 
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Install Azure functions CLI

As described [here](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#v2): 
```bash
npm install -g azure-functions-core-tools@3
```

## Initialise terraform

### Authenticate using a service pricipal
Follow the isntructions [here](https://www.terraform.io/docs/providers/azurerm/guides/service_principal_client_secret.html) to log in using the Azure CLI, create, and set the service prinicpal for Terraform to use.

### Set environment variables with your Service Principal's information
Create a copy of the `.env.template` file called `.env`. The `.env` file is ignored by git.

Follow the process described [here](https://www.terraform.io/docs/providers/azurerm/guides/service_principal_client_secret.html#configuring-the-service-principal-in-terraform) to create your service principal, and get the required login values. 
Use those values to populate the following values used for authenticating the Service Principal in the `.env` file:

```bash
export ARM_CLIENT_ID="{appId}"
export ARM_CLIENT_SECRET="{password}"
export ARM_SUBSCRIPTION_ID="{subscriptionId}"
export ARM_TENANT_ID="{tenant}"
```

Load the values from the .env file using the command `source .env`.

### Create a storage acount for the backend config
The `.env` file will set environment variables that determine the name of the resource group, the location, and the storage account used for saving Terraform state.
Note that storage account names need to be globally unique, so you will have to update the storage account name provided in the `.env.template` file. You can check whether a chosen name is available using the following command: 
```bash
az storage account check-name --name $TERRAFORM_SA
```

Create a resource group and storage account for storing the backend config using the following script:
```bash
az group create -n $RESOURCE_GROUP -l $LOCATION
az storage account create -n $TERRAFORM_SA -g $RESOURCE_GROUP --sku Standard_LRS
az storage container create --name $TERRAFORM_CONTAINER --account-name $TERRAFORM_SA
```

### Run Terraform
Download and configure the Terraform providers by running: 
```bash
terraform init -backend-config="storage_account_name=$TERRAFORM_SA" -backend-config="container_name=$TERRAFORM_CONTAINER" -backend-config="key=$ENVIRONMENT.terraform.tfstate" -backend-config="resource_group_name=$RESOURCE_GROUP"
```
These commands may take a while to respond - be patient.

Login so that external scripts can run using the Service Principal:
```bash
az login  --service-principal -u $ARM_CLIENT_ID -p $ARM_CLIENT_SECRET --tenant $ARM_TENANT_ID
```

Now deploy your environment by applying the terraform configuration:
```bash
terraform apply -input=false -auto-approve -var-file="vars/$ENVIRONMENT.tfvars" -var "project_name=$RESOURCE_GROUP" -var "build_id=$(date +%s)"
```
The build_id variable is used to determine whether to deploy the function apps' code. It will only deploy the code if the build_id is different from the previous deployment. This value is optional, and defaults to `1`. Not setting it will cause the code to only be deployed the first time you apply the configuration. Specifying `build_id=$(date +%s)` will set it to the current time, forcing it to deploy the code every time you apply the configuration.

Test your setup by making a POST request with the below body to https://{$RESOURCE_GROUP}-apim-dev.azure-api.net/patient/

```json
{
  "firstName": "FirstName",
  "lastName": "LastName",
  "fullName": "FullName",
  "gender": "male",
  "dateOfBirth": "1908-05-23",
  "postCode": "0001",
  "insuranceNumber": "ins0001",
  "preferredContactNumber": "01012345567"
}
```