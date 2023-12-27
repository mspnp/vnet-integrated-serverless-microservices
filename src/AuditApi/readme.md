# Getting started

## Prerequisites

- Node 12
- Azure functions CLI v3
- Azure CLI

This project includes a [dev container](https://code.visualstudio.com/docs/remote/containers), with the prerequisites installed.

Copy the contents of `template.settings.json` to a file in the root folder called `local.settings.json`. This is where you will keep all the settings used for running the app locally. If you are running in a dev container, remember to replace all references to `localhost` in your settings with `host.docker.internal`

## Mongodb

You'll need a mongodb to use to store data:

### Create a CosmosDB with a Mongo API

Follow the steps [here](https://learn.microsoft.com/azure/cosmos-db/connect-mongodb-account) to get the connection string.

### Use the CosmosDB emulator with a Mongo API

Follow the instructions [here](https://learn.microsoft.com/azure/cosmos-db/local-emulator#installation) to install the emulator and obtain the connection string.
Start the emulator using `C:\Program Files\Azure Cosmos DB Emulator\Microsoft.Azure.Cosmos.Emulator.exe /EnableMongoDbEndpoint=3.6`

### Host your own MongoDB

Instructions for hosting your own mongodb isntance can be found [here](https://docs.mongodb.com/manual/installation/)

Now update the `mongo_connection_string` setting in your `local.settings.json` file with the connection string for your chosen mongodb host.

Connect to your mongodb instance using the Azure portal, or a client application such as robo3t or mongo shell, and create a database called `newcastle` and a collection called `audits`.

## Running the code

Start by opening a terminal and running `npm install`.
You can run the code by running `func host start` in teh terminal or by using VS Code:

### VS Code

The .vscode contains all the tasks you need to run and debug the code. You can press f5 to run the application and debug it, as described [here](https://learn.microsoft.com/azure/azure-functions/functions-develop-vs-code?tabs=csharp#debugging-functions-locally)

Try it out by doing an HTPP POST to `http://localhost:7072/api/auditrecord` with the following body:

```json
{
  "resource": {
    "id": "resourceid",
    "operation": "resourceoperation",
    "type": "resourcetype"
  },
  "sourceSystemName": "sourcesystem"
}
```

If your settings and MongoDB instance is configured correctly, you should receive a 201 response. The `audits` collection in your db should now contain a new record.

## Running the tests

This project contains unit and integration tests written using Mocha. You can run the code using npm by running `npm test` in the terminal. You can also use the [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter) extension for VS Code to run the tests.

## Test coverage reports

The project has been configured to generate test coverage reports, using the mocha provider for Istanbul. To generate the report, run the following script:

```bash
npm install
npm run build
npm run cover
```

If all tests passes, a folder called `.coverage` wil be generated. Open the `index.html` to view the report.

## Linting

This project is configured to use ESLint for linting. Run the liniting from the terminal using `npm run lint`, or using the 'lint whole folder' task for the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for VSCode.

## Publishing to Azure

To publish this code to Azure and obtain a public url using VSCode, follow the instructions [here](https://learn.microsoft.com/azure/azure-functions/functions-develop-vs-code?tabs=csharp#publish-to-azure).

To significantly reduce the size of the deployed package, run `npm run build:production` before publishing your app.

If your function app already exists, you can use the Functions CLI to publish using the command `func azure functionapp publish {functionappname}` as described [here](https://learn.microsoft.com/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#publish).
