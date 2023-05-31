output "patient_api_url" {
  value = "${azurerm_api_management.apim.gateway_url}/${azurerm_api_management_api.patient.path}${azurerm_api_management_api_operation.patient_create.url_template}"
}

output "patient_sub_key" {
  value = azurerm_api_management_subscription.patient_subscription.primary_key
  sensitive = true
}