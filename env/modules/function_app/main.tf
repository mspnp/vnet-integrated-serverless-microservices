# Function App
resource "azurerm_linux_function_app" "fa" {
  name                        = var.name
  resource_group_name         = var.resource_group_name
  location                    = var.location
  service_plan_id             = var.service_plan_id
  storage_account_name        = var.storage_account_name
  storage_account_access_key  = var.storage_account_access_key
  enabled                     = true
  https_only                  = true
  functions_extension_version = "~4"
  app_settings = merge(
    {
      FUNCTION_APP_EDIT_MODE         = "readonly"
    },
    var.extra_app_settings
  )
  
  site_config {
    ftps_state = "Disabled"
    ip_restriction {
      virtual_network_subnet_id = var.ip_restriction_subnet_id
    }
    application_insights_key    = var.app_insights_instrumentation_key
    application_stack {
      node_version = "18"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["WEBSITE_MOUNT_ENABLED"],
      virtual_network_subnet_id
    ]
  }
}

# Key Vault Access Policy
resource "azurerm_key_vault_access_policy" "fa" {
  key_vault_id = var.key_vault_id
  tenant_id    = azurerm_linux_function_app.fa.identity[0].tenant_id
  object_id    = azurerm_linux_function_app.fa.identity[0].principal_id

  secret_permissions = [
    "Get"
  ]
}
