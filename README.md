# Container Scan

## Deprecation Notice
This project is no longer actively maintained, and has had some deficiencies for sometime now. If anyone is interested to implement the action logic on their own or fork the repo then feel free to do so. Adding few consise points below on what this action does, which might help others to replicate it.

1. `Trivy` and `Dockle` are used internally for running certain kinds of scans on images.
2. It accepts some necessary inputs that are passed to `Trivy`/`Dockle` to run cli commands.
3. It allows users to update an allowedlist of vulnerabilities for the repo. So that the action doesn't shows up the allowed vulnerabilites on every run.
4. For leveraging this feature the `scanitizer` app needs to be installed/integrated for consumption of appropriate APIs to update the allowedlist for the repo.

This action may be archived in the future, but it will still be consumable in the workflows. Just that it won't be maintained in the future.

## Overview
This action can be used to help you add some additional checks to help you secure your Docker Images in your  CI. This would help you attain some confidence in your docker image before pushing them to your container registry or a deployment.

It internally uses `Trivy` and `Dockle` for running certain kinds of scans on these images. 
- [`Trivy`](https://github.com/aquasecurity/trivy) helps you find the common vulnerabilities within your docker images. 
- [`Dockle`](https://github.com/goodwithtech/dockle) is a container linter, which helps you identify if you haven't followed 
  - Certain best practices while building the image 
  - [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/) to secure your docker image

Please checkout [Trivy](https://github.com/aquasecurity/trivy/blob/main/LICENSE) and [Dockle](https://github.com/goodwithtech/dockle/blob/master/LICENSE) licenses.

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
  <tr>
    <td><code>trivy-version</code></td>
    <td>(Optional) Version of Trivy to run, e.g. 0.22.0. The default is to use latest version. </td>
    <td>''</td>
  </tr>

</table>

## Action output
The action generates an output file consisting of detailed description of all the detected vulnerabilities and best practice violations in JSON format. This file can be accessed by using the output variable `scan-report-path`.  
Here is a sample scan report:
```json
{
  "imageName": "myacr.azurecr.io/testapp:770aed6bd33d7240b4bdb55f16348ce37b86bb09",
  "vulnerabilities": [
    {
      "vulnerabilityId": "CVE-2018-12886",
      "packageName": "gcc-8-base",
      "severity": "HIGH",
      "description": "stack_protect_prologue in cfgexpand.c and stack_protect_epilogue in function.c in GNU Compiler Collection (GCC) 4.1 through 8 (under certain circumstances) generate instruction sequences when targeting ARM targets that spill the address of the stack protector guard, which allows an attacker to bypass the protection of -fstack-protector, -fstack-protector-all, -fstack-protector-strong, and -fstack-protector-explicit against stack overflow by controlling what the stack canary is compared against.",
      "target": "myacr.azurecr.io/ascdemo:770aed6bd33d7240b4bdb55f16348ce37b86bb09 (debian 10.4)"
    },
    {
      "vulnerabilityId": "CVE-2019-20367",
      "packageName": "libbsd0",
      "severity": "CRITICAL",
      "description": "nlist.c in libbsd before 0.10.0 has an out-of-bounds read during a comparison for a symbol name from the string table (strtab).",
      "target": "myacr.azurecr.io/ascdemo:770aed6bd33d7240b4bdb55f16348ce37b86bb09 (debian 10.4)"
    },
    {
      "vulnerabilityId": "CVE-2020-1751",
      "packageName": "libc-bin",
      "severity": "HIGH",
      "description": "An out-of-bounds write vulnerability was found in glibc before 2.31 when handling signal trampolines on PowerPC. Specifically, the backtrace function did not properly check the array bounds when storing the frame address, resulting in a denial of service or potential code execution. The highest threat from this vulnerability is to system availability.",
      "target": "myacr.azurecr.io/ascdemo:770aed6bd33d7240b4bdb55f16348ce37b86bb09 (debian 10.4)"
    }
  ],
  "bestPracticeViolations": [
    {
      "code": "CIS-DI-0001",
      "title": "Create a user for the container",
      "level": "WARN",
      "alerts": "Last user should not be root"
    },
    {
      "code": "CIS-DI-0005",
      "title": "Enable Content trust for Docker",
      "level": "INFO",
      "alerts": "export DOCKER_CONTENT_TRUST=1 before docker pull/build"
    }
  ],
  "vulnerabilityScanTimestamp": "2021-03-05T09:38:48.036Z"
}
```

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
    image-name: my-image:my-tag
```

### Container scan of an image available on a private registry

```yaml
- uses: azure/container-scan@v0
  with:
    image-name: loginServerUrl/my-image:${{ github.sha }} # loginServerlUrl/ would be empty if it's hosted on dockerhub; ${{ github.sha }} could also be replaced with any desired image tag
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

### Container scan of an image available locally, publically, or privately using workflow environment variables
```yaml
- uses: azure/container-scan@v0
  with:
    image-name: ${{ env.loginServerUrl }}/my-image:${{ github.sha }} # ${{ env.loginServerUrl }}/ would be empty if it's hosted on dockerhub; ${{ github.sha }} could also be replaced with any desired image tag
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

The following is an example of not just this action, but how this action could be used along with other actions to setup a CI. 

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
