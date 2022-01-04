export const trivyOutput = {
  "Results": [
      {
        "Target": "php-app/composer.lock",
        "Vulnerabilities": null
      },
      {
        "Target": "node-app/package-lock.json",
        "Vulnerabilities": [
          {
            "VulnerabilityID": "CVE-2018-16487",
            "PkgName": "lodash",
            "InstalledVersion": "4.17.4",
            "FixedVersion": "\u003e=4.17.11",
            "Title": "lodash: Prototype pollution in utilities function",
            "Description": "A prototype pollution vulnerability was found in lodash \u003c4.17.11 where the functions merge, mergeWith, and defaultsDeep can be tricked into adding or modifying properties of Object.prototype.",
            "Severity": "HIGH",
            "References": [
              "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-16487",
            ]
          }
        ]
      },
      {
        "Target": "trivy-ci-test (alpine 3.7.1)",
        "Vulnerabilities": [
          {
            "VulnerabilityID": "CVE-2018-16840",
            "PkgName": "curl",
            "InstalledVersion": "7.61.0-r0",
            "FixedVersion": "7.61.1-r1",
            "Title": "curl: Use-after-free when closing \"easy\" handle in Curl_close()",
            "Description": "A heap use-after-free flaw was found in curl versions from 7.59.0 through 7.61.1 in the code related to closing an easy handle. ",
            "Severity": "HIGH",
            "References": [
              "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-16840",
            ]
          },
          {
            "VulnerabilityID": "CVE-2019-3822",
            "PkgName": "curl",
            "InstalledVersion": "7.61.0-r0",
            "FixedVersion": "7.61.1-r2",
            "Title": "curl: NTLMv2 type-3 header stack buffer overflow",
            "Description": "libcurl versions from 7.36.0 to before 7.64.0 are vulnerable to a stack-based buffer overflow. ",
            "Severity": "HIGH",
            "References": [
              "https://curl.haxx.se/docs/CVE-2019-3822.html",
              "https://lists.apache.org/thread.html/8338a0f605bdbb3a6098bb76f666a95fc2b2f53f37fa1ecc89f1146f@%3Cdevnull.infra.apache.org%3E"
            ]
          },
          {
            "VulnerabilityID": "CVE-2018-16839",
            "PkgName": "curl",
            "InstalledVersion": "7.61.0-r0",
            "FixedVersion": "7.61.1-r1",
            "Title": "curl: Integer overflow leading to heap-based buffer overflow in Curl_sasl_create_plain_message()",
            "Description": "Curl versions 7.33.0 through 7.61.1 are vulnerable to a buffer overrun in the SASL authentication code that may lead to denial of service.",
            "Severity": "HIGH",
            "References": [
              "https://github.com/curl/curl/commit/f3a24d7916b9173c69a3e0ee790102993833d6c5",
            ]
          },
          {
            "VulnerabilityID": "CVE-2018-19486",
            "PkgName": "git",
            "InstalledVersion": "2.15.2-r0",
            "FixedVersion": "2.15.3-r0",
            "Title": "git: Improper handling of PATH allows for commands to be executed from the current directory",
            "Description": "Git before 2.19.2 on Linux and UNIX executes commands from the current working directory (as if '.' were at the end of $PATH) in certain cases involving the run_command() API and run-command.c, because there was a dangerous change from execvp to execv during 2017.",
            "Severity": "HIGH",
            "References": [
              "https://usn.ubuntu.com/3829-1/",
            ]
          },
          {
            "VulnerabilityID": "CVE-2018-17456",
            "PkgName": "git",
            "InstalledVersion": "2.15.2-r0",
            "FixedVersion": "2.15.3-r0",
            "Title": "git: arbitrary code execution via .gitmodules",
            "Description": "Git before 2.14.5, 2.15.x before 2.15.3, 2.16.x before 2.16.5, 2.17.x before 2.17.2, 2.18.x before 2.18.1, and 2.19.x before 2.19.1 allows remote code execution during processing of a recursive \"git clone\" of a superproject if a .gitmodules file has a URL field beginning with a '-' character.",
            "Severity": "HIGH",
            "References": [
              "http://www.securitytracker.com/id/1041811",
            ]
          }
        ]
      },
      {
        "Target": "python-app/Pipfile.lock",
        "Vulnerabilities": null
      },
      {
        "Target": "ruby-app/Gemfile.lock",
        "Vulnerabilities": null
      },
      {
        "Target": "rust-app/Cargo.lock",
        "Vulnerabilities": null
      }
    ]
  };

  export const dockleOutput = {
    "summary": {
      "fatal": 6,
      "warn": 2,
      "info": 2,
      "pass": 7
    },
    "details": [
      {
        "code": "CIS-DI-0001",
        "title": "Create a user for the container",
        "level": "WARN",
        "alerts": [
          "Last user should not be root"
        ]
      },
      {
        "code": "CIS-DI-0005",
        "title": "Enable Content trust for Docker",
        "level": "INFO",
        "alerts": [
          "export DOCKER_CONTENT_TRUST=1 before docker pull/build"
        ]
      },
      {
        "code": "CIS-DI-0006",
        "title": "Add HEALTHCHECK instruction to the container image",
        "level": "WARN",
        "alerts": [
          "not found HEALTHCHECK statement"
        ]
      },
      {
        "code": "CIS-DI-0008",
        "title": "Remove setuid and setgid permissions in the images",
        "level": "INFO",
        "alerts": [
          "Found setuid file: usr/lib/openssh/ssh-keysign urwxr-xr-x"
        ]
      },
      {
        "code": "CIS-DI-0009",
        "title": "Use COPY instead of ADD in Dockerfile",
        "level": "FATAL",
        "alerts": [
          "Use COPY : /bin/sh -c #(nop) ADD file:81c0a803075715d1a6b4f75a29f8a01b21cc170cfc1bff6702317d1be2fe71a3 in /app/credentials.json "
        ]
      },
      {
        "code": "CIS-DI-0010",
        "title": "Do not store secrets in ENVIRONMENT variables",
        "level": "FATAL",
        "alerts": [
          "Suspicious ENV key found : MYSQL_PASSWD"
        ]
      },
      {
        "code": "CIS-DI-0010",
        "title": "Do not store secret files",
        "level": "FATAL",
        "alerts": [
          "Suspicious filename found : app/credentials.json "
        ]
      },
      {
        "code": "DKL-DI-0002",
        "title": "Avoid sensitive directory mounting",
        "level": "FATAL",
        "alerts": [
          "Avoid mounting sensitive dirs : /usr"
        ]
      },
      {
        "code": "DKL-DI-0005",
        "title": "Clear apt-get caches",
        "level": "FATAL",
        "alerts": [
          "Use 'rm -rf /var/lib/apt/lists' after 'apt-get install' : /bin/sh -c apt-get update \u0026\u0026 apt-get install -y git"
        ]
      },
      {
        "code": "DKL-LI-0001",
        "title": "Avoid empty password",
        "level": "FATAL",
        "alerts": [
          "No password user found! username : nopasswd"
        ]
      }
    ]
  };