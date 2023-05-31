variable "name" {}

variable "resource_group_name" {}

variable "location" {}

variable "service_plan_id" {}

variable "storage_account_name" {}

variable "storage_account_access_key" {}

variable "app_insights_connection_string" {}

variable "extra_app_settings" {
  type    = map
  default = {}
}

variable "ip_restriction_subnet_id" {
  default = null
}

variable "key_vault_id" {}
