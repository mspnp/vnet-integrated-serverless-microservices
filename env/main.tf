terraform {
  backend "azurerm" {}
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=3.58.0"
    }
    external = {
      source = "hashicorp/external"
      version = "~>2.3.1"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "external" {
}

data "azurerm_client_config" "current" {}

# Resource Group
data "azurerm_resource_group" "rg" {
  name = var.project_name
}

# Cosmos DB Account
resource "azurerm_cosmosdb_account" "cosmos" {
  name                = "${var.project_name}-cosmos-${var.environment}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = var.location
  offer_type          = "Standard"
  kind                = "MongoDB"

  enable_automatic_failover = false

  consistency_policy {
    consistency_level = "Strong"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  capabilities {
    name = "EnableMongo"
  }
}

# Cosmos DB Mongo Database
resource "azurerm_cosmosdb_mongo_database" "mongodb" {
  name                = var.project_name
  resource_group_name = azurerm_cosmosdb_account.cosmos.resource_group_name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

# Cosmos DB Mongo Collection
resource "azurerm_cosmosdb_mongo_collection" "coll_patient" {
  name                = "patients"
  resource_group_name = azurerm_cosmosdb_mongo_database.mongodb.resource_group_name
  account_name        = azurerm_cosmosdb_mongo_database.mongodb.account_name
  database_name       = azurerm_cosmosdb_mongo_database.mongodb.name
  shard_key           = "_shardKey"
  throughput          = 400

  index { keys = ["id"] }
  index { 
    keys = ["_id"]
    unique = true 
  }
  index { keys = ["firstName"] }
  index { keys = ["lastName"] }
  index { keys = ["fullName"] }
  index { keys = ["gender"] }
  index { keys = ["dateOfBirth"] }
  index { keys = ["postCode"] }
  index { keys = ["insuranceNumber"] }
  index { keys = ["preferredContactNumber"] }
  index { keys = ["lastUpdated"] }
  index { keys = ["_dateOfBirthDate"] }
}

# Cosmos DB Mongo Collection for Tests
resource "azurerm_cosmosdb_mongo_collection" "coll_test" {
  name                = "tests"
  resource_group_name = azurerm_cosmosdb_mongo_database.mongodb.resource_group_name
  account_name        = azurerm_cosmosdb_mongo_database.mongodb.account_name
  database_name       = azurerm_cosmosdb_mongo_database.mongodb.name
  shard_key           = "_shardKey"
  throughput          = 400

  index { 
    keys = ["_id"]
    unique = true 
  }
}

# Cosmos DB Mongo Collection for Audit
resource "azurerm_cosmosdb_mongo_collection" "coll_audit" {
  name                = "audits"
  resource_group_name = azurerm_cosmosdb_mongo_database.mongodb.resource_group_name
  account_name        = azurerm_cosmosdb_mongo_database.mongodb.account_name
  database_name       = azurerm_cosmosdb_mongo_database.mongodb.name
  shard_key           = "_shardKey"
  throughput          = 400

  index { 
    keys = ["_id"]
    unique = true 
  }
}

# Storage Account
resource "azurerm_storage_account" "sa" {
  name                      = "${var.project_name}sa${var.environment}"
  resource_group_name       = data.azurerm_resource_group.rg.name
  location                  = var.location
  account_kind              = "StorageV2"
  account_tier              = "Standard"
  account_replication_type  = "LRS"
  access_tier               = "Hot"
  enable_https_traffic_only = true
}

# Elastic Premium Plan
resource "azurerm_service_plan" "asp_patient_api" {
  name                = "${var.project_name}-asp-patient-api-${var.environment}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = var.location
  os_type             = "Linux"

  # https://docs.microsoft.com/en-us/azure/azure-functions/functions-networking-options#regional-virtual-network-integration
  # A /26 with 64 addresses accommodates a Premium plan with 30 instances.
  maximum_elastic_worker_count = 30

  sku_name = "EP1"
}

# Consumption Plan
resource "azurerm_service_plan" "asp_audit_api" {
  name                = "${var.project_name}-asp-audit-api-${var.environment}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "law" {
  name                = "${var.project_name}-law-${var.environment}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Application Insights
resource "azurerm_application_insights" "ai" {
  name                = "${var.project_name}-ai-${var.environment}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = var.location
  application_type    = "Node.JS"
  workspace_id        = azurerm_log_analytics_workspace.law.id
}

# Virtual Network
resource "azurerm_virtual_network" "vnet" {
  name                = "${var.project_name}-vnet-${var.environment}"
  resource_group_name = data.azurerm_resource_group.rg.name
  location            = var.location
  address_space       = ["10.0.0.0/16"]
}

# Subnet for APIM
resource "azurerm_subnet" "apim-snet" {
  name                 = "${var.project_name}-apim-snet-${var.environment}"
  resource_group_name  = data.azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.0.96/28"]
  
  delegation {
   name = "apimdelegation"
  
   service_delegation {
     name    = "Microsoft.ApiManagement/service"
     actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
   }
  }

  service_endpoints = ["Microsoft.Web"]
}

# Subnet for Patient API
resource "azurerm_subnet" "snet" {
  name                 = "${var.project_name}-snet-${var.environment}"
  resource_group_name  = data.azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.0.0/26"]

  delegation {
    name = "fadelegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }

  service_endpoints = ["Microsoft.Web"]
}

# Function App Module
# Patient API
module "fa_patient_api" {
  source                           = "./modules/function_app"
  name                             = "${var.project_name}-fa-patient-api-${var.environment}"
  resource_group_name              = data.azurerm_resource_group.rg.name
  location                         = var.location
  service_plan_id                  = azurerm_service_plan.asp_patient_api.id
  storage_account_name             = azurerm_storage_account.sa.name
  storage_account_access_key       = azurerm_storage_account.sa.primary_access_key
  app_insights_connection_string   = azurerm_application_insights.ai.connection_string
  ip_restriction_subnet_id         = azurerm_subnet.apim-snet.id

  extra_app_settings = {
    mongo_connection_string = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.cosmos_conn.id})"
    patient_tests_database  = "newcastle"
    audit_api_url           = "https://${module.fa_audit_api.default_hostname}/api/auditrecord"
    audit_auth_key          = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.fa_audit_api_host_key.id})"
  }

  key_vault_id = azurerm_key_vault.kv.id
}

# Deploy Patient API to Function App
resource "null_resource" "deploy_patient_api" {
  triggers = {
    build_number = var.build_id
  }

  provisioner "local-exec" {
    command     = "npm run build:production && func azure functionapp publish ${module.fa_patient_api.name} --typescript"
    working_dir = "../src/PatientTestsApi"
    interpreter = ["bash", "-c"]
  }

  depends_on = [
    module.fa_patient_api
  ]
}

# Audit API
module "fa_audit_api" {
  source                           = "./modules/function_app"
  name                             = "${var.project_name}-fa-audit-api-${var.environment}"
  resource_group_name              = data.azurerm_resource_group.rg.name
  location                         = var.location
  service_plan_id                  = azurerm_service_plan.asp_audit_api.id
  storage_account_name             = azurerm_storage_account.sa.name
  storage_account_access_key       = azurerm_storage_account.sa.primary_access_key
  app_insights_connection_string   = azurerm_application_insights.ai.connection_string
  ip_restriction_subnet_id         = azurerm_subnet.snet.id

  extra_app_settings = {
    mongo_connection_string = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.cosmos_conn.id})"
    audit_database          = "newcastle"
  }

  key_vault_id = azurerm_key_vault.kv.id
}

# Deploy Audit API to Function App
resource "null_resource" "deploy_audit_api" {
  triggers = {
    build_number = var.build_id
  }

  provisioner "local-exec" {
    command     = "npm run build:production && func azure functionapp publish ${module.fa_audit_api.name} --typescript"
    working_dir = "../src/AuditApi"
    interpreter = ["bash", "-c"]
  }

  depends_on = [
    module.fa_audit_api
  ]
}

# Function App Host Keys for Patient API
data azurerm_function_app_host_keys fa_patient_api_host_key {
  name = module.fa_patient_api.name
  resource_group_name = data.azurerm_resource_group.rg.name
  depends_on = [
    module.fa_patient_api,
    null_resource.deploy_patient_api
  ]
}

# Function App Host Keys for Audit API
data azurerm_function_app_host_keys fa_audit_api_host_key {
  name = module.fa_audit_api.name
  resource_group_name = data.azurerm_resource_group.rg.name
  depends_on = [ 
    module.fa_audit_api,
    null_resource.deploy_audit_api 
  ]
}

# Regional VNet Integration for Patient API
resource "azurerm_app_service_virtual_network_swift_connection" "vnet_int" {
  app_service_id = module.fa_patient_api.id
  subnet_id      = azurerm_subnet.snet.id
}

# API Management
resource "azurerm_api_management" "apim" {
  name                 = "${var.project_name}-apim-${var.environment}"
  resource_group_name  = data.azurerm_resource_group.rg.name
  location             = var.location
  publisher_name       = var.publisher_name
  publisher_email      = var.publisher_email
  virtual_network_type = "External"

  sku_name = "Developer_1"

  virtual_network_configuration {
    subnet_id = azurerm_subnet.apim-snet.id
  }

  identity {
    type = "SystemAssigned"
  }
}

# API Management Subscription for Patient Api
resource "azurerm_api_management_subscription" "patient_subscription" {
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = azurerm_api_management.apim.resource_group_name
  api_id              = azurerm_api_management_api.patient.id
  display_name        = "patient_subscription"
  state               = "active"
}

# API Management Logger
resource "azurerm_api_management_logger" "logger" {
  name                = "logger"
  resource_group_name = data.azurerm_resource_group.rg.name
  api_management_name = azurerm_api_management.apim.name

  application_insights {
    instrumentation_key = azurerm_application_insights.ai.instrumentation_key
  }
}

# API Management Diagnostic
resource "azurerm_api_management_diagnostic" "diagnostic" {
  identifier          = "applicationinsights"
  resource_group_name = data.azurerm_resource_group.rg.name
  api_management_name = azurerm_api_management.apim.name
  api_management_logger_id =  azurerm_api_management_logger.logger.id 
}

# API Management Backend
# 2020-05-12 Currently azurerm provider cannot add function app as backend to API Management
# https://github.com/terraform-providers/terraform-provider-azurerm/issues/5032
resource "azurerm_api_management_backend" "fa_patient_api" {
  name                = "fa-patient-api"
  resource_group_name = azurerm_api_management.apim.resource_group_name
  api_management_name = azurerm_api_management.apim.name
  protocol            = "http"
  url                 = "https://${module.fa_patient_api.default_hostname}"
  resource_id         = "https://management.azure.com/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.project_name}/providers/Microsoft.Web/sites/${module.fa_patient_api.name}"
}

# Patient API
resource "azurerm_api_management_api" "patient" {
  name                = "patient-api"
  resource_group_name = azurerm_api_management.apim.resource_group_name
  api_management_name = azurerm_api_management.apim.name
  revision            = "1"
  display_name        = "Patient API"
  path                = "patient"
  protocols           = ["https"]
  service_url         = "https://${module.fa_patient_api.default_hostname}/api/patient"
}

# Patient API Base Policy
resource "azurerm_api_management_api_policy" "patient_policy" {
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name

  xml_content = <<XML
<policies>
  <inbound>
    <base />
    <!-- Look for func-host-key in the cache -->
    <cache-lookup-value key="func-host-key-${azurerm_key_vault_secret.fa_patient_api_host_key.version}" variable-name="funchostkey" />
    <!-- If API Management doesn’t find it in the cache, make a request for it and store it -->
    <choose>
      <when condition="@(!context.Variables.ContainsKey("funchostkey"))">
        <!-- Make HTTP request to get function host key -->
        <send-request ignore-error="false" timeout="20" response-variable-name="coderesponse" mode="new">
          <set-url>${azurerm_key_vault_secret.fa_patient_api_host_key.id}?api-version=7.0</set-url>
          <set-method>GET</set-method>
          <authentication-managed-identity resource="https://vault.azure.net" />
        </send-request>
        <!-- Store response body in context variable -->
        <set-variable name="funchostkey" value="@((string)((IResponse)context.Variables["coderesponse"]).Body.As<JObject>()["value"])" />
        <!-- Store result in cache -->
        <cache-store-value key="func-host-key-${azurerm_key_vault_secret.fa_patient_api_host_key.version}" value="@((string)context.Variables["funchostkey"])" duration="100000" />
      </when>
    </choose>
    <set-header name="x-functions-key" exists-action="override">
      <value>@((string)context.Variables["funchostkey"])</value>
    </set-header>
  </inbound>
</policies>
XML
}

# Patient API Create Operation
resource "azurerm_api_management_api_operation" "patient_create" {
  operation_id        = "patient-create"
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name
  display_name        = "Create Patient"
  method              = "POST"
  url_template        = "/"
}

# Patient API Load Operation
resource "azurerm_api_management_api_operation" "patient_load" {
  operation_id        = "patient-load"
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name
  display_name        = "Load Patient"
  method              = "GET"
  url_template        = "/{patientId}"

  template_parameter {
    name     = "patientId"
    required = true
    type     = "guid"
  }
}

# Patient API Update Operation
resource "azurerm_api_management_api_operation" "patient_update" {
  operation_id        = "patient-update"
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name
  display_name        = "Update Patient"
  method              = "PUT"
  url_template        = "/{patientId}"

  template_parameter {
    name     = "patientId"
    required = true
    type     = "guid"
  }
}

# Patient API Search Operation
resource "azurerm_api_management_api_operation" "patient_search" {
  operation_id        = "patient-search"
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name
  display_name        = "Search Patient"
  method              = "POST"
  url_template        = "/search"
}

# Patient API Test Create Operation
resource "azurerm_api_management_api_operation" "test_create" {
  operation_id        = "test-create"
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name
  display_name        = "Create Test"
  method              = "POST"
  url_template        = "/{patientId}/tests"
  template_parameter  {
    name  = "patientId"
    required = true
    type = "guid"
  }
}

# Patient API Test Load Operation
resource "azurerm_api_management_api_operation" "tests_load" {
  operation_id        = "tests-load"
  api_name            = azurerm_api_management_api.patient.name
  api_management_name = azurerm_api_management_api.patient.api_management_name
  resource_group_name = azurerm_api_management_api.patient.resource_group_name
  display_name        = "Load Tests"
  method              = "GET"
  url_template        = "/{patientId}/tests/*"
  template_parameter  {
    name  = "patientId"
    required = true
    type = "guid"
  }
}

# Key Vault
resource "azurerm_key_vault" "kv" {
  name                        = "${var.project_name}-kv-${var.environment}"
  resource_group_name         = data.azurerm_resource_group.rg.name
  location                    = var.location
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  purge_protection_enabled    = false

  sku_name = "standard"
}

# Key Vault Access Policy for deployment user
resource "azurerm_key_vault_access_policy" "sp" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Delete",
    "Get",
    "Set"
  ]
}

# Key Vault Access Policy for API Management
resource "azurerm_key_vault_access_policy" "apim" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = azurerm_api_management.apim.identity[0].tenant_id
  object_id    = azurerm_api_management.apim.identity[0].principal_id

  secret_permissions = [
    "Get"
  ]
}

# Key Vault Secret for Cosmos DB Connection String
resource "azurerm_key_vault_secret" "cosmos_conn" {
  name         = "cosmos-conn"
  value        = "${azurerm_cosmosdb_account.cosmos.connection_strings[0]}&retryWrites=false"
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [
    azurerm_key_vault_access_policy.sp
  ]
}

# Key Vault Secret for Patient Function App Host Keys
resource "azurerm_key_vault_secret" "fa_patient_api_host_key" {
  name         = "fa-patient-api-host-key"
  value        = data.azurerm_function_app_host_keys.fa_patient_api_host_key.default_function_key
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [
    azurerm_key_vault_access_policy.sp
  ]
}

# Key Vault Secret for Audit Function App Host Keys
resource "azurerm_key_vault_secret" "fa_audit_api_host_key" {
  name         = "fa-audit-api-host-key"
  value        = data.azurerm_function_app_host_keys.fa_audit_api_host_key.default_function_key
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [
    azurerm_key_vault_access_policy.sp
  ]
}