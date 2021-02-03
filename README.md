# Container Scan

This action can be used to help you add some additional checks to help you secure your Docker Images in your  CI. This would help you attain some confidence in your docker image before pushing them to your container registry or a deployment.

It internally uses `Trivy` and `Dockle` for running certain kinds of scans on these images. 
- [`Trivy`](https://github.com/aquasecurity/trivy) helps you find the common vulnerabilities within your docker images. 
- [`Dockle`](https://github.com/goodwithtech/dockle) is a container linter, which helps you identify if you haven't followed 
  - Certain best practices while building the image 
  - [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/) to secure your docker image

## Action inputs

<table>
  <thead>
    <tr>
      <th width="25%">Action input</th>
      <th width="65%">Description</th>
      <th width="10%">Default Value</th>
    </tr>
  </thead>
  <tr>
    <td><code>image-name</code></td>
    <td>(Required) The Docker image to be scanned</td>
    <td>''</td>
  </tr>
  <tr>
    <td><code>severity-threshold</code></td>
    <td>(Optional) Minimum severity threshold set to control flagging of the vulnerabilities found during the scan. The available levels are: (UNKNOWN, LOW, MEDIUM, HIGH, CRITICAL); if you set the severity-threshold to be `MEDIUM` every CVE found of a level higher than or equal to `MEDIUM` would be displayed</td>
    <td>HIGH</td>
  </tr>
  <tr>
    <td><code>run-quality-checks</code></td>
    <td>(Optional) This is a boolean value. When set to `true` adds additional checks to ensure the image follows best practices and CIS standards.</td>
    <td>true</td>
  </tr>
  <tr>
    <td><code>username</code></td>
    <td>(Optional) Username to authenticate to the Docker registry. This is only required when you're trying to pull an image from your private registry</td>
    <td>''</td>
  </tr>
  <tr>
    <td><code>password</code></td>
    <td>(Optional) Password to authenticate to the Docker registry. This is only required when you're trying to pull an image from your private registry</td>
    <td>''</td>
  </tr>
</table>

## Action output
The action generates an output file consisting of detailed description of all the detected vulnerabilities and best practice violations in JSON format. This file can be accessed by using the output variable `scan-report-path`.

## Ignoring vulnerabilities
In case you would like the action to ignore any vulnerabilities and best practice checks, create an allowedlist file at the path `.github/containerscan/allowedlist.yaml` in your repo. Here's an example allowedlist.yaml file.

```yaml
general:
  vulnerabilities:
    - CVE-2003-1307
    - CVE-2007-0086
    - CVE-2019-3462
    - CVE-2011-3374
  bestPracticeViolations:
    - CIS-DI-0005
    - DKL-LI-0003
    - CIS-DI-0006
    - DKL-DI-0006
```
Install [Scanitizer](https://github.com/apps/scanitizer) (currently in Beta) on your repository for more convenient management of allowedlist file.

## Example YAML snippets

### Container scan of an image available locally or publically available on dockerhub

```yaml
- uses: azure/container-scan@v0
  with:
    image-name: my-image:${{ github.sha }}
```

### Container scan of an image available on a private registry

```yaml
- uses: azure/container-scan@v0
  with:
    image-name: loginServerUrl/my-image:${{ github.sha }} # loginServerlUrl would be empty if it's hosted on dockerhub
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

### Container scan of an image available locally, publically, or privately using workflow environment variables
```yaml
- uses: azure/container-scan@v0
  with:
    image-name: ${{ env.loginServerUrl }}/my-image:${{ github.sha }} # loginServerlUrl would be empty if it's hosted on dockerhub
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

## End to end workflow using Azure

The following is an example of not just this action, but how this action could be used along with other  actions to setup a CI. 

Where your CI would:
- Build a docker image 
- Scan the docker image for any security vulnerabilities
- Publish it to your private container registry.

```yaml
on: [push]

jobs:
  build-secure-and-push:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master

    - run: docker build . -t contoso.azurecr.io/k8sdemo:${{ github.sha }}
      
    - uses: Azure/container-scan@v0
      with:
        image-name: contoso.azurecr.io/k8sdemo:${{ github.sha }}
    
    - uses: Azure/docker-login@v1
      with:
        login-server: contoso.azurecr.io
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - run: docker push contoso.azurecr.io/k8sdemo:${{ github.sha }}
```
## End to end workflow using any container repository and workflow environment variables

The following is an example of not just this action, but how this action could be used along with other  actions to setup a CI. 

Where your CI would:
- Build a docker image 
- Scan the docker image for any security vulnerabilities
- Publish it to your preferred container registry.

This example assumes you have defined an evironment variable in your workflow for `CONTAINER_REGISTRY`.

```yaml
on: [push]

jobs:
  build-secure-and-push:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master

    - run: docker build . -t ${{ env.CONTAINER_REGISTRY }}/k8sdemo:${{ github.sha }}
      
    - uses: Azure/container-scan@v0
      with:
        image-name: ${{ env.CONTAINER_REGISTRY }}/k8sdemo:${{ github.sha }}
    
    - uses: Azure/docker-login@v1
      with:
        login-server: ${{ env.CONTAINER_REGISTRY }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - run: docker push ${{ env.CONTAINER_REGISTRY }}/k8sdemo:${{ github.sha }}
```

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
