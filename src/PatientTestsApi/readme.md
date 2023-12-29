# Getting started

## Prerequisites

- Node 12
- Azure Functions CLI v3
- The Azure CLI

This project includes a [dev container](https://code.visualstudio.com/docs/remote/containers), with the prerequisites installed.

Copy the contents of `template.settings.json` to a file in the root folder called `local.settings.json`. This is where you will keep all the settings used for running the app locally. If you are running in a dev container, remember to replace all references to `localhost` in your settings with `host.docker.internal`

## MongoDB

You'll need a MongoDB to use to store data:

### Create an Azure Cosmos DB with a Mongo API

Follow the steps in [Connect a MongoDB application to Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/connect-mongodb-account) to get the connection string.

### Use the Azure Cosmos DB emulator with a Mongo API

Follow the [Install the emulator](https://learn.microsoft.com/azure/cosmos-db/how-to-develop-emulator#install-the-emulator) instructions to install the emulator and obtain the connection string. Start the emulator using `C:\Program Files\Azure Cosmos DB Emulator\Microsoft.Azure.Cosmos.Emulator.exe /EnableMongoDbEndpoint=3.6`

### Host your own MongoDB

Instructions for hosting your own MongoDB isntance can be found in [Install MongoDB](https://docs.mongodb.com/manual/installation/).

Now update the `mongo_connection_string` setting in your `local.settings.json` file with the connection string for your chosen MongoDB host.

Connect to your MongoDB instance using the Azure portal, or a client application such as robo3t or mongo shell, and create a database called `newcastle` and a collection called `patients`.

## Running the code

Start by opening a terminal and running `npm install`.
You can run the code by running `func host start` in the terminal or by using Visual Studio Code:

### Visual Studio Code

The .Visual Studio Code contains all the tasks you need to run and debug the code. You can press F5 to run the application and debug it, as described in [Debug functions locally](https://learn.microsoft.com/azure/azure-functions/functions-develop-vs-code?tabs=csharp#debugging-functions-locally).

Try it out by doing an HTPP POST to `http://localhost:7071/api/patient` with the following body:

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

If your settings and MongoDB instance is configured correctly, you should receive a 201 response. The `patient` collection in your db should now contain a new record.

## Running the tests

This project contains unit and integration tests written using Mocha. You can run the code using npm by running `npm test` in the terminal. You can also use the [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter) extension for Visual Studio Code to run the tests.

## Test coverage reports

The project has been configured to generate test coverage reports, using the mocha provider for Istanbul. To generate the report, run the following script:

```bash
npm install
npm run build
npm run cover
```

If all tests passes, a folder called `.coverage` wil be generated. Open the `index.html` to view the report.

## Linting

This project is configured to use ESLint for linting. Run the liniting from the terminal using `npm run lint`, or using the 'lint whole folder' task for the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for Visual Studio Code.

## Publishing to Azure

To publish this code to Azure and obtain a public URL using Visual Studio Code, follow the instructions [here](https://learn.microsoft.com/azure/azure-functions/functions-develop-vs-code?tabs=csharp#publish-to-azure).

To significantly reduce the size of the deployed package, run `npm run build:production` before publishing your app.

If your function app already exists, you can use the functions CLI to publish using the command `func azure functionapp publish {functionappname}` as described in [Publish to Azure](https://learn.microsoft.com/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#publish).
