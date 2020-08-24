# Key Rotation Pattern with Terraform

In our scenario, we keep all sensitive information in Key Vault like the host API key of two function apps, PatientTests API and Audit API. With Key Vault, the communication between API Management and Function Apps is as follows:

- Patient API in API Management first retrieves the PatientTests API host key from Key Vault, caches it and then puts it into an HTTP header when calling PatientTests API function app.
- PatientTests API function app also retrieves the Audit API host key from Key Vault and puts it into an HTTP header when calling Audit API function app.
- The Azure Function runtimes validates the key in the HTTP header on incoming requests.

It looks all good, but we can keep improving the system security by some approaches. One of them is key rotation. You can rotate the key periodically to make the system more secure or you can also rotate the key on demand in case of key leakage. We will demonstrate the key rotation pattern with Terraform which we used in our scenario.

## Key Rotation for Audit API Function App

Let's say we want to rotate the host key of the Audit API function app. We can first think about what we need to change in order to keep the system functional. There are three places we need to change.

1. The host key itself in Audit API function app
2. The secret in Key Vault which stores the host key
3. The Key Vault reference in the application settings of the PatientTests API function app - it needs to refer the latest secret version instead of the old one.

You can perform these tasks manually in the Azure Portal, or you can use the Azure CLI with the following commands:

1. Rotate the host key: [Web Apps - Create Or Update Host Secret](https://docs.microsoft.com/en-us/rest/api/appservice/webapps/createorupdatehostsecret)
2. Update the secret: [az keyvault secret set](https://docs.microsoft.com/en-us/cli/azure/keyvault/secret?view=azure-cli-latest#az-keyvault-secret-set)
3. Update the key vault reference in app settings: [az functionapp config appsettings set](https://docs.microsoft.com/en-us/cli/azure/functionapp/config/appsettings?view=azure-cli-latest#az-functionapp-config-appsettings-set)

However, we don't want to do these tasks manually due to following reasons.

1. Because we are using Terraform as IaC (Infrastructure as Code), we should maintain our configuration in Terraform, as far as possible. It's a bad practice if you mix Terraform and manual resource provisioning.
2. In this case, the key vault reference in App Settings depends on the secret's latest `id` and the secret `value` depends on the host key in function app. With Terraform you can refer these resources very easily and Terraform will maintain these resources based on their dependencies.

### Rotate the host key

At the time of writing, Terraform Azure Provider does not provide native access to Function App keys, so we have to use the [Web Apps - Create Or Update Host Secret](https://docs.microsoft.com/en-us/rest/api/appservice/webapps/createorupdatehostsecret) REST API to rotate the host key. It's okay, since Terraform does not maintain the host key, we don't have to worry about the state management. The Azure CLI command looks like this:

```bash
az rest --method put --uri /subscriptions/<YOUR_SUBSCRIPTION>/resourceGroups/newcastle/providers/Microsoft.Web/sites/newcastle-fa-audit-api-dev/host/default/functionkeys/default?api-version=2019-08-01 --body <YOUR_PAYLOAD>
```

`<YOUR_PAYLOAD>` is a JSON object like this:

```json
{
    properties: {
        name: <KEY_NAME>
        value: <KEY_VALUE>
    }
}
```

### Update the secret

As we mentioned before, Terraform does not maintain the host key of function app, so we use the API to retrieve the host key with an `external` provider. Terraform will check if the secret needs to be updated based on the retrieved host key. The complete code can be found in the `/env` folder. Here are some highlights from the code:

```terraform
data "external" "fa_audit_api_host_key" {
  program = ["bash", "-c", "az rest --method post --uri /subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.project_name}/providers/Microsoft.Web/sites/${module.fa_audit_api.name}/host/default/listKeys?api-version=2019-08-01 --query functionKeys"]
}

resource "azurerm_key_vault_secret" "fa_audit_api_host_key" {
  name         = "fa-audit-api-host-key"
  value        = data.external.fa_audit_api_host_key.result.default
  key_vault_id = azurerm_key_vault.kv.id
}
```

### Update the Key Vault reference in App Settings

When the secret is updated, a new version will be created. That's why we need to create a `data` secret to refer the `resource` secret to get the latest `id`. The Key Vault reference in App Settings should also refer to the `data` secret instead of the `resource` secret.

```terraform
data "azurerm_key_vault_secret" "fa_audit_api_host_key" {
  name         = azurerm_key_vault_secret.fa_audit_api_host_key.name
  key_vault_id = azurerm_key_vault_secret.fa_audit_api_host_key.key_vault_id
}

module "fa_patient_api" {
  ...
  extra_app_settings = {
    ...
    audit_auth_key = "@Microsoft.KeyVault(SecretUri=${data.azurerm_key_vault_secret.fa_audit_api_host_key.id})"
  }
}
```

## Key Rotation for PatientTests API Function App

Now let's have a look at key rotation for PatientTests API function app. Just like the other API, there are three places we need to change.

1. The host key itself in PatientTests API function app
2. The secret in Key Vault which stores the host key
3. The Key Vault reference in the caching policy of Patient API in API Management

While you can finish those tasks in Azure Portal or with the Azure CLI like previous section, we will keep using Terraform as mush as possible.

### Rotate the host key for the Audit API

Same as rotating the host key of Audit API function app, we use the API.

```bash
az rest --method put --uri /subscriptions/<YOUR_SUBSCRIPTION>/resourceGroups/newcastle/providers/Microsoft.Web/sites/newcastle-fa-patient-api-dev/host/default/functionkeys/default?api-version=2019-08-01 --body <YOUR_PAYLOAD>
```

### Update the secret  for the Audit API

Same as updating the secret for the host key of Audit API function app.

```terraform
data "external" "fa_patient_api_host_key" {
  program = ["bash", "-c", "az rest --method post --uri /subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.project_name}/providers/Microsoft.Web/sites/${module.fa_patient_api.name}/host/default/listKeys?api-version=2019-08-01 --query functionKeys"]
}

resource "azurerm_key_vault_secret" "fa_patient_api_host_key" {
  name         = "fa-patient-api-host-key"
  value        = data.external.fa_patient_api_host_key.result.default
  key_vault_id = azurerm_key_vault.kv.id
}
```

### Update the key vault reference in caching policy

If a secret in Key Vault is changed, a new `id` will be generated for the secret. Since Patient API caching policy refers to the key vault secret with the latest `id`, Terraform will update the reference in caching policy if the secret is updated with a new `id`.

Since we cached the host key in API Management, the retired key may still exist in the cache, we need to find a way to remove it from cache or update it to the latest host key. We are using internal cache in API Management and there is no REST API to handle internal cache, so it's not easy to update or remove the cache. To address this we use the latest secret `version` as the key for the cache item, like this `key="func-host-key-${data.azurerm_key_vault_secret.fa_patient_api_host_key.version}"`? So if the host key is updated, the cache name will be updated as well which will raise a cache miss and force API Management to retrieve the latest host key in Key Vault. The policy can easily be generated in Terraform like below:

```terraform
data "azurerm_key_vault_secret" "fa_patient_api_host_key" {
  name         = azurerm_key_vault_secret.fa_patient_api_host_key.name
  key_vault_id = azurerm_key_vault_secret.fa_patient_api_host_key.key_vault_id
}

resource "azurerm_api_management_api_policy" "patient_policy" {
  ...
  xml_content = <<XML
<policies>
  <inbound>
    ...
    <!-- Look for func-host-key in the cache -->
    <cache-lookup-value key="func-host-key-${data.azurerm_key_vault_secret.fa_patient_api_host_key.version}" variable-name="funchostkey" />
    <!-- If API Management doesn’t find it in the cache, make a request for it and store it -->
    <choose>
      <when condition="@(!context.Variables.ContainsKey("funchostkey"))">
        <!-- Make HTTP request to get function host key -->
        <send-request ignore-error="false" timeout="20" response-variable-name="coderesponse" mode="new">
          <set-url>${data.azurerm_key_vault_secret.fa_patient_api_host_key.id}?api-version=7.0</set-url>
          <set-method>GET</set-method>
          <authentication-managed-identity resource="https://vault.azure.net" />
        </send-request>
        <!-- Store response body in context variable -->
        <set-variable name="funchostkey" value="@((string)((IResponse)context.Variables["coderesponse"]).Body.As<JObject>()["value"])" />
        <!-- Store result in cache -->
        <cache-store-value key="func-host-key-${data.azurerm_key_vault_secret.fa_patient_api_host_key.version}" value="@((string)context.Variables["funchostkey"])" duration="100000" />
      </when>
    </choose>
  </inbound>
</policies>
XML
}
```

## All in one to rotate host keys

Last but not least, how do we rotate host keys? There are only two steps:

1. Use Azure CLI to update either or both host keys.
2. Run `terraform apply` with your variables to update the dependent systems
