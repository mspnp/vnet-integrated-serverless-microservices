az rest --method put --uri /subscriptions/<YOUR_SUBSCRIPTION>/resourceGroups/newcastle/providers/Microsoft.Web/sites/newcastle-fa-audit-api-dev/host/default/functionkeys/default?api-version=2019-08-01 --body <YOUR_PAYLOAD>


az functionapp keys list -g $RESOURCE_GROUP -n $RESOURCE_GROUP-fa-audit-api-dev

az functionapp keys set --key-name "default" --key-type functionKeys -g $RESOURCE_GROUP -n $RESOURCE_GROUP-fa-audit-api-dev



#old audit key: LpQiOzBvow2zSzoMLbw5poUR8QDD61vcf82XatgjnHXiAzFu7sKZ3A==
#new audit key: QGVxn69ZzEQZgpvOcmBz238IsJKUbS9ps3ypJDduh3g0AzFu6K0cvw==
#old audit secret version: 200e2d4f340649488c37f6a3b4ff9591