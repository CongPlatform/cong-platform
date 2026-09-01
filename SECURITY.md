# Security Policy

Security is an important part of the CONG project, especially because the platform may handle organizational, account, and user-related data.

## Supported versions

CONG is currently under active development and has not yet reached a stable 1.0 release.

Security fixes are applied to the latest version maintained in the official repository.

Older commits, forks, experimental branches, and independently modified versions may not receive security updates from the CONG maintainers.

## Reporting a vulnerability

Please do **not** disclose security vulnerabilities through public Issues, Discussions, Pull Requests, or other public channels.

When private vulnerability reporting is available in the official CONG repository, use GitHub's **Report a vulnerability** feature under the repository's Security section.

If private vulnerability reporting is temporarily unavailable, do not publish technical details of the vulnerability. Open a non-sensitive Issue asking the maintainers for an appropriate private contact channel.

## What to include in a report

When possible, include:

- a clear description of the vulnerability;

- the affected component or route;

- the conditions required to reproduce the issue;

- the potential security impact;

- steps that help reproduce the problem;

- relevant logs or screenshots with sensitive data removed;

- possible mitigation or remediation ideas, if known.

Do not include real passwords, access tokens, private keys, personal data, production credentials, or other secrets in reports.

## Responsible disclosure

Please allow the maintainers reasonable time to investigate and address a reported vulnerability before publicly disclosing technical details.

The maintainers may coordinate with the reporter regarding remediation and eventual disclosure.

## Scope

Security reports may include, among other issues:

- authentication or authorization bypasses;

- tenant isolation failures;

- unauthorized access to another organization's data;

- exposure of credentials or sensitive configuration;

- insecure file uploads;

- access-control problems;

- injection vulnerabilities;

- cross-site scripting (XSS);

- vulnerabilities involving session or token handling;

- privilege escalation;

- unintended exposure of personal or organizational data.

General bugs that do not have a security impact should be reported through the normal Issue tracker.

## Security testing

Security research must not intentionally damage systems, disrupt services, destroy data, access information belonging to other users, or affect production users.

Testing should preferably be performed against a local development environment, a personal Supabase project, or another environment for which the tester has authorization.

## Secrets and credentials

Contributors must never commit:

- `.env` files containing real credentials;

- Supabase secret keys;

- database passwords or connection strings containing real passwords;

- access or refresh tokens;

- private cryptographic keys;

- production service credentials.

Example configuration files such as `.env.example` must contain placeholders only.

If a secret is accidentally committed, removing it from the latest commit is not sufficient. The credential should be considered compromised and rotated.

## Dependencies

Security issues found in third-party dependencies should also be reported when they materially affect CONG.

Dependency updates that address known vulnerabilities are welcome through Pull Requests when they can be safely validated.

## Contact and coordination

Security reports are reviewed by the CONG maintainers.

Once the public repository is available, the preferred reporting mechanism will be GitHub's private vulnerability reporting feature.
