---
page_type: sample
languages:
- typescript
- terraform
products:
- azure-functions
- azure-cosmos-db
- azure-application-insights
- azure-api-management
- azure-key-vault
description: "An end-to-end Azure Functions sample. This sample shows distributed telemetry, secret management, networking lockdown, deployment, and load testing."
urlFragment: "project-newcastle"
---

# Project Newcastle

This repo contains a sample showcasing a key part of a recent customer engagement. We've distilled it down to the main technical lessons learned to serve as a scaffold for future work. The majority of business logic and detail related to data models have been removed to simplify the code; this extends to security and infrastructure elements.

The sample shows:

- managing and deployment using Terraform
- distributed telemetry using App Insights
- secret management using Key Vault
- networking lockdown using Azure Functions
- load testing using Locust
- database access using Mongo API on Cosmos DB

## Contents

| File/folder       | Description                                       |
|-------------------|---------------------------------------------------|
| `src`             | Sample source code for APIs.                      |
| `src\LoadTest`    | Source code and deployment scripts for loadtests. |
| `docs`            | Technical writeups.                               |
| `env`             | Terraform deployment content.                     |
| `.gitignore`      | Define what to ignore at commit time.             |
| `CONTRIBUTING.md` | Guidelines for contributing to the sample.        |
| `README.md`       | This README file.                                 |
| `LICENSE`         | The license for the sample.                       |

## Scenario

The organisation needs to digitally store the results of patient medical tests. Other internal and third-party systems will need to interface with this data via an API that allows reading and writing of the data. These interactions need to be recorded in an audit register. Access to the API needs to be managed by a system that allows for easy integration with different authentication mechanisms. APIs should not be publically accessible outside of a single managed endpoint. All code and infrastructure deployment should be automated.

## Solution Architecture

The following diagram represents the architecture of the solution.

![Solution Architecture](./docs/images/ProjectArchitecture.png)

At the core of the solution is a set of micro-services. The first service (PatientTests API) provides the CRUD operations for patients and their associated tests. The second service (Audit API) provides operations to create auditing entries. Both of these services store data in Cosmos DB, using the Mongo API. The Cosmos DB endpoint can be replaced with another Mongo DB service, without changing code. The services don't share data, and each service may be deployed to it's own independent database. More information regarding the way in which the data is accessed by the APIs can be found *here - placeholder*

## Security

The Audit API is locked down to only be accessible at a network level from other systems in the same vnet. The PatientTests API is similarly locked down to only be accessible from API Management.  Only the API Management is accessible from the public internet. In addition to the network-level security, the function apps are also protected by requiring service keys for access. These keys are maintained in Key Vault, along with other sensitive data such as connection strings, and is only available to specified identiies. More information on the security aspects can be found [here](./docs/security_pattern.md). In addition, keys can be rotated to make the system more secure. More information about key rotation can be found [here](./docs/key_rotation.md).

## Distributed Telemetry

Telemetry is captured across the whole request pipeline from API Management and the Functions. Telemetry shares a common operation id, allowing it to be correlated across these components. More information about this distributed telemetry tracing can be found [here](docs/distributed_telemetry.md).

## The code

The solution may be deployed using Terraform. The terraform templates and code is available in the `/env` folder. The [readme](./env/readme.md) explains how to deploy the environment into your own Azure subscription. This can easily be automated using a system such as Azure DevOps or Github Actions.

The [PatientTests API](./src/PatientTestsApi/readme.md) and the [Audit API](./src/AuditApi/readme.md) may be found in the `/src` folder.

Each of these three folders contain a [dev container](https://code.visualstudio.com/docs/remote/containers), which will have all the prerequisites installed, to help you get going quicker.

The APIs are built using Typescript on Azure Functions. Both the PatientTests API and the Audit API have a full suite of automated integration and unit tests. This helps to prevent regressions when any changes are made. It is also set up to do linting using ESLint to maintain code styles and help guard against unintentional errors. The services' respective readme's contain information on how to run the tests and linting.

## Load Test

The project contains a [Locust load test](./src/LoadTest/README.md) against the API Management in the `/src/LoadTest` folder. [Locust](https://locust.io/) is an open source load testing tool and the tests are written in Python. The load tests can be run locally and remotely in AKS cluster.
