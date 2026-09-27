# Política de Segurança

[English version below](#security-policy)

Segurança é uma parte importante do projeto CONG, especialmente porque a plataforma pode lidar com dados organizacionais, de contas e de usuários.

## Versões suportadas

O CONG está atualmente em desenvolvimento ativo e ainda não atingiu uma versão estável 1.0.

Correções de segurança são aplicadas à versão mais recente mantida no repositório oficial.

Commits antigos, forks, branches experimentais e versões modificadas de forma independente podem não receber atualizações de segurança dos mantenedores do CONG.

## Reportando uma vulnerabilidade

Por favor, **não** divulgue vulnerabilidades de segurança através de Issues públicas, Discussions, Pull Requests ou outros canais públicos.

O CONG possui o recurso de **relato privado de vulnerabilidades** do GitHub habilitado. Para enviar um relatório:

1. Acesse a página principal do repositório no GitHub.
2. Clique na aba **Security and quality**. Se ela não estiver visível, abra o menu de abas adicionais e selecione **Security and quality**.
3. Na barra lateral, na seção **Reporting**, clique em **Advisories**.
4. Clique em **Report a vulnerability**.
5. Preencha o formulário com os detalhes da vulnerabilidade e envie o relatório através do botão **Submit report**.

Esse processo envia as informações de forma privada aos mantenedores do repositório.

Se o recurso de relato privado estiver temporariamente indisponível, não publique detalhes técnicos da vulnerabilidade. Nesse caso, abra uma Issue **sem informações sensíveis ou detalhes técnicos da vulnerabilidade**, solicitando aos mantenedores um canal privado adequado.

## O que incluir em um relatório

Quando possível, inclua:

* uma descrição clara da vulnerabilidade;
* o componente ou rota afetada;
* as condições necessárias para reproduzir o problema;
* o impacto potencial de segurança;
* passos que ajudem a reproduzir o problema;
* logs ou capturas de tela relevantes, com dados sensíveis removidos;
* ideias de mitigação ou correção, caso existam.

Não inclua senhas reais, tokens de acesso, chaves privadas, dados pessoais, credenciais de produção ou outros segredos nos relatórios.

## Divulgação responsável

Por favor, dê aos mantenedores um tempo razoável para investigar e corrigir uma vulnerabilidade reportada antes de divulgar publicamente detalhes técnicos.

Os mantenedores podem se coordenar com quem reportou em relação à correção e à eventual divulgação.

## Escopo

Relatórios de segurança podem incluir, entre outros problemas:

* bypass de autenticação ou autorização;
* falhas de isolamento entre tenants;
* acesso não autorizado a dados de outra organização;
* exposição de credenciais ou configurações sensíveis;
* uploads de arquivos inseguros;
* problemas de controle de acesso;
* vulnerabilidades de injeção;
* cross-site scripting (XSS);
* vulnerabilidades envolvendo sessão ou manipulação de tokens;
* escalação de privilégios;
* exposição não intencional de dados pessoais ou organizacionais.

Bugs gerais que não tenham impacto de segurança devem ser reportados através do sistema normal de Issues.

## Testes de segurança

Pesquisas de segurança não devem, intencionalmente, danificar sistemas, interromper serviços, destruir dados, acessar informações pertencentes a outros usuários ou afetar usuários de produção.

Os testes devem, preferencialmente, ser realizados contra um ambiente de desenvolvimento local, um projeto Supabase pessoal, ou outro ambiente para o qual quem testa tenha autorização.

## Segredos e credenciais

Contribuidores nunca devem commitar:

* arquivos `.env` contendo credenciais reais;
* chaves secretas do Supabase;
* senhas de banco de dados ou strings de conexão contendo senhas reais;
* tokens de acesso ou refresh tokens;
* chaves criptográficas privadas;
* credenciais de serviços de produção.

Arquivos de configuração de exemplo, como `.env.example`, devem conter apenas placeholders.

Se um segredo for commitado acidentalmente, removê-lo do commit mais recente não é suficiente. A credencial deve ser considerada comprometida e deve ser rotacionada.

## Dependências

Problemas de segurança encontrados em dependências de terceiros também devem ser reportados quando afetarem materialmente o CONG.

Atualizações de dependências que corrigem vulnerabilidades conhecidas são bem-vindas através de Pull Requests, quando puderem ser validadas com segurança.

## Contato e coordenação

Relatórios de segurança são revisados pelos mantenedores do CONG.

O mecanismo preferencial para reportar vulnerabilidades é o recurso **Private vulnerability reporting** do GitHub descrito nesta política. Os relatórios enviados por esse mecanismo ficam privados e podem ser tratados diretamente pelos mantenedores.

---

# Security Policy

[Versão em português acima](#política-de-segurança)

Security is an important part of the CONG project, especially because the platform may handle organizational, account, and user-related data.

## Supported versions

CONG is currently under active development and has not yet reached a stable 1.0 release.

Security fixes are applied to the latest version maintained in the official repository.

Older commits, forks, experimental branches, and independently modified versions may not receive security updates from the CONG maintainers.

## Reporting a vulnerability

Please do **not** disclose security vulnerabilities through public Issues, Discussions, Pull Requests, or other public channels.

CONG has GitHub's **private vulnerability reporting** feature enabled. To submit a report:

1. Go to the repository's main page on GitHub.
2. Click the **Security and quality** tab. If it is not visible, open the additional tabs menu and select **Security and quality**.
3. In the sidebar, under **Reporting**, click **Advisories**.
4. Click **Report a vulnerability**.
5. Fill in the vulnerability details and submit the report using **Submit report**.

This process sends the information privately to the repository maintainers.

If private vulnerability reporting is temporarily unavailable, do not publish technical details of the vulnerability. Instead, open an Issue **without sensitive information or technical vulnerability details**, asking the maintainers for an appropriate private contact channel.

## What to include in a report

When possible, include:

* a clear description of the vulnerability;
* the affected component or route;
* the conditions required to reproduce the issue;
* the potential security impact;
* steps that help reproduce the problem;
* relevant logs or screenshots with sensitive data removed;
* possible mitigation or remediation ideas, if known.

Do not include real passwords, access tokens, private keys, personal data, production credentials, or other secrets in reports.

## Responsible disclosure

Please allow the maintainers reasonable time to investigate and address a reported vulnerability before publicly disclosing technical details.

The maintainers may coordinate with the reporter regarding remediation and eventual disclosure.

## Scope

Security reports may include, among other issues:

* authentication or authorization bypasses;
* tenant isolation failures;
* unauthorized access to another organization's data;
* exposure of credentials or sensitive configuration;
* insecure file uploads;
* access-control problems;
* injection vulnerabilities;
* cross-site scripting (XSS);
* vulnerabilities involving session or token handling;
* privilege escalation;
* unintended exposure of personal or organizational data.

General bugs that do not have a security impact should be reported through the normal Issue tracker.

## Security testing

Security research must not intentionally damage systems, disrupt services, destroy data, access information belonging to other users, or affect production users.

Testing should preferably be performed against a local development environment, a personal Supabase project, or another environment for which the tester has authorization.

## Secrets and credentials

Contributors must never commit:

* `.env` files containing real credentials;
* Supabase secret keys;
* database passwords or connection strings containing real passwords;
* access or refresh tokens;
* private cryptographic keys;
* production service credentials.

Example configuration files such as `.env.example` must contain placeholders only.

If a secret is accidentally committed, removing it from the latest commit is not sufficient. The credential should be considered compromised and rotated.

## Dependencies

Security issues found in third-party dependencies should also be reported when they materially affect CONG.

Dependency updates that address known vulnerabilities are welcome through Pull Requests when they can be safely validated.

## Contact and coordination

Security reports are reviewed by the CONG maintainers.

The preferred mechanism for reporting vulnerabilities is GitHub's **Private vulnerability reporting** feature described in this policy. Reports submitted through this mechanism remain private and can be handled directly by the repository maintainers.
