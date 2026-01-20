# Relatório de Segurança - PainelBeton

## Visão Geral
A aplicação utiliza o **Supabase Auth** para autenticação e **Row Level Security (RLS)** para controle de acesso aos dados. Abaixo estão os pontos de atenção e recomendações.

### 1. Autenticação e Registro de Usuários
*   **Estado Atual:** Não existe uma página pública de cadastro (`signup.html`), apenas login (`login.html`). Isso é positivo.
*   **Risco:** Se a opção **"Enable Email Signups"** estiver ativada nas configurações do projeto Supabase (o que é o padrão), um atacante técnico poderia criar uma conta usando a API do Supabase diretamente (via `supabase.auth.signUp`), contornando a falta de interface visual.
*   **Consequência:** Como nossas políticas RLS dão permissão total para "authenticated users", esse novo usuário teria poderes de administrador (criar/apagar ferramentas).
*   **Recomendação:** Desativar "Email Signups" no painel do Supabase (Authentication > Providers > Email) e criar usuários apenas via convite (Invite) ou ter uma tabela de `admins` para validar permissões nas policies.

### 2. Políticas de Banco de Dados (RLS)
*   **Tabelas `tools`, `categories`, `rentals`:**
    *   **Política:** `to authenticated` (Permite INSERT/UPDATE/DELETE).
    *   **Análise:** Adequado para um MVP onde apenas o Admin tem conta. Crítico se houver usuários comuns logados.
*   **Tabela `coupons`:**
    *   **Política Admin:** Acesso total para autenticados.
    *   **Política Pública:** Leitura permitida para todos (`using (true)`).
    *   **Risco:** Qualquer pessoa pode listar todos os cupons existentes consultando a API, descobrindo códigos e valores.
    *   **Recomendação:** Restringir a leitura pública apenas para cupons onde `active = true`. (Já implementado parcialmente, mas a query atual permite select *). Idealmente, usar uma `security definer function` para validar cupons sem expor a tabela, ou aceitar que códigos ativos são públicos.

### 3. Proteção XSS (Frontend)
*   **Análise:** O código utiliza `innerHTML` para renderizar ferramentas e tabelas.
*   **Risco:** Se um admin mal-intencionado (ou se houver brecha no cadastro) inserir um nome de ferramenta como `<img src=x onerror=alert(1)>`, isso será executado no navegador dos clientes.
*   **Mitigação:** Sanitizar inputs ou usar `textContent` onde possível. Como é um painel administrativo fechado, o risco é menor, mas existente.

## Ações Sugeridas (Imediatas)
1.  **Segurança de Cupons:** Alterar a política pública de cupons para permitir visualizar apenas colunas não sensíveis ou apenas validar a existência.
2.  **SQL de Segurança Extra:** Criar um script para "trancar" o acesso de escrita apenas para um e-mail específico (o seu), caso queira garantir que novos usuários não tenham acesso.

Como o sistema é simples e você é o único usuário, o nível atual é **aceitável** desde que o **Signups** esteja desabilitado no Supabase.
