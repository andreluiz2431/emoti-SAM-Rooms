# e-SAM (electronic SAM)

Aplicação web interativa inspirada na dinâmica de salas do **Kahoot** e fundamentada nos instrumentos científicos **emoti-SAM** (Hayashi et al., 2016) e **SAM Original** (Bradley & Lang, 1994) para avaliação da experiência afetiva nas 3 dimensões do modelo PAD: **Valência**, **Excitação** e **Dominância**.

Projetada para medir a resposta afetiva no uso de **sistemas computacionais** (usabilidade e IHC) ou participação em **ações de extensão universitária e atividades educacionais**, com participação anônima por padrão e sem exigir conta ou login dos respondentes.

---

## Principais Funcionalidades

- **Dois Instrumentos Pictóricos em SVG (Puramente Pictóricos para o Respondente):**
  - **e-SAM (emoti-SAM):** 15 ilustrações expressivas coloridas para Valência, Excitação e Dominância.
  - **SAM Original (Lang & Bradley):** 15 ilustrações clássicas em manequim (expressões faciais, explosão abdominal e variação de tamanho corporal).
  - Na tela do respondente, nenhuma legenda textual visível aparece abaixo das figuras; todas as descrições são mantidas em `alt` e `aria-label` para leitores de tela.
- **Três Escalas Padronizadas (`3`, `5` ou `9` pontos):**
  - Pontuação sempre padronizada: `1` = menor/mais negativo e nota máxima (`3`, `5` ou `9`) = maior/mais positivo.
  - Personalização por dimensão: exibir/ocultar títulos, editar textos/descrições `alt`, inverter ordem visual (`Positivo → Negativo` ou `Negativo → Positivo`) e substituir imagens opcionalmente com pré-visualização completa em tempo real.
- **Autenticação do Criador via E-mail + Código OTP (6 dígitos):**
  - Fluxo gratuito em 2 etapas via API HTTP (`EMAIL_PROVIDER=resend` ou `brevo`, com validade de 10 minutos e fallback em console quando `EMAIL_API_KEY` não está configurada em desenvolvimento).
  - O servidor armazena apenas o hash irreversível **SHA-256** do e-mail.
- **Anonimato por Padrão e `ID_Usuario` Único:**
  - Respondentes entram diretamente apenas com o PIN de 6 dígitos (o campo de nome só aparece se o criador marcar *"Exigir identificação do respondente"*).
  - Cada submissão recebe um `ID_Usuario` único (`USR-<timestamp>-<hex>`) exibido na tabela e incluído em CSV/JSON, diferenciando até mesmo homônimos.
- **Bloqueio de Integridade Metodológica:**
  - Configurações do instrumento podem ser editadas enquanto a sala tem 0 respostas e são bloqueadas permanentemente assim que a 1ª resposta é registrada.
- **Visualizações Científicas (Hayashi et al., 2016):**
  - **Barras Empilhadas Divergentes (Figura 9)** centralizadas no eixo neutro.
  - **Boxplots por Dimensão (Figura 8)** com Q1, mediana, Q3, limites de Tukey, média e outliers.
  - **Mapa Afetivo 2D (Affective Grid)** cruzando Valência × Excitação nos 4 quadrantes emocionais.
- **Persistência em Volume (30 dias) e Exportação/Importação:**
  - Armazenamento em `rooms.json` sem banco externo, com retenção automática de 30 dias.
  - Exportação em **CSV PT-BR** (`e-sam-sala-<pin>.csv`, UTF-8 BOM + `;`) e **JSON Completo** (`e-sam-sala-<pin>-completo.json`), além de clonagem/importação de sala via `.json`.

---

## Executando Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Executar em modo desenvolvimento (porta 3000)
npm run dev

# 3. Executar testes unitários
npm test

# 4. Build de produção + execução
npm run build
npm start
```

Acesse `http://localhost:3000`. Sem `EMAIL_API_KEY`, o código OTP de 6 dígitos é exibido no console do servidor e no aviso de ambiente de desenvolvimento.

---

## Variáveis de Ambiente (Railway)

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta HTTP (injetada automaticamente pelo Railway) |
| `RAILWAY_VOLUME_MOUNT_PATH` | Monte um Volume em `/data` no Railway para persistir `rooms.json` |
| `EMAIL_PROVIDER` | `resend` (padrão) ou `brevo` |
| `EMAIL_API_KEY` | Chave de API gratuita do Resend ou Brevo para envio real dos códigos OTP |
| `EMAIL_FROM` | Remetente (ex.: `e-SAM <onboarding@resend.dev>` ou remetente verificado no Brevo) |

> **Nota para quem usa Brevo no Railway:** Por padrão, a Brevo bloqueia requisições vindas de IPs desconhecidos (erro `401: unrecognised IP address`). Como o Railway utiliza IPs dinâmicos, acesse **Configurações → Segurança → IPs Autorizados** (`https://app.brevo.com/security/authorised_ips`) e clique em **Desativar bloqueio** (*Disable blocking*).

---

## Referências Científicas

- **Hayashi, E. C. S., Posada, J. E. G., Maike, V. R. M. L., & Baranauskas, M. C. C. (2016).** *Exploring new formats of the Self-Assessment Manikin in the design with children.* Proceedings of IHC'16, SBC.
- **Bradley, M. M., & Lang, P. J. (1994).** *Measuring emotion: the Self-Assessment Manikin and the semantic differential.* Journal of Behavior Therapy and Experimental Psychiatry, 25(1), 49–59.
- **Oliveira, A. B. (2021).** *e-SAM: Uma Proposta de Solução para Apoiar a Avaliação do Estado Afetivo de Usuários na Interação com Sistemas Computacionais.* TCC, UNIPAMPA.
