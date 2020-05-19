output "patient_api_url" {
  value = "${azurerm_api_management.apim.gateway_url}/${azurerm_api_management_api.patient.path}${azurerm_api_management_api_operation.patient_create.url_template}"
}

output "master_sub_key" {
  value = data.external.apim_master_key.result.primaryKey
}
