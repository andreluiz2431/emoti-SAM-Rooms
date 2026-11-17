# emoti-SAM Rooms

Aplicação web interativa inspirada na dinâmica de salas do **Kahoot** e fundamentada no instrumento científico **emoti-SAM** (Hayashi et al., 2016 — *Self-Assessment Manikin* adaptado com emoticons/emojis para as dimensões do modelo PAD: **Valência**, **Excitação** e **Dominância**).

Projetada para avaliar a experiência afetiva tanto em **sistemas computacionais** (usabilidade e IHC) quanto em **ações de extensão universitária e atividades educacionais**, sem exigir criação de conta ou login dos participantes.

---

## Principais Funcionalidades

- **Instrumento emoti-SAM Fiel em SVG:** 15 ilustrações SVG coloridas estilo desenhado à mão com contorno preto espesso e preenchimento amarelo vibrante para as 3 dimensões (**Valência/Prazer**, **Excitação/Alerta** e **Dominância/Controle**).
- **Duas Escalas Configuráveis:**
  - **5 pontos:** Seleção direta entre as 5 figuras (ideal para ações de extensão, oficinas e público infantil/geral).
  - **9 pontos:** 5 figuras principais alinhadas a 9 botões de rádio (`9` a `1`), permitindo marcações intermediárias (ideal para avaliações detalhadas de sistemas computacionais).
- **Dinâmica de Sala via PIN & QR Code:** Entrada imediata com PIN de 6 dígitos + Nome/Apelido, suporte a link direto (`/?pin=123456`) e **Modo Telão** para projeção em sala de aula.
- **Certificação do Criador via CPF (LGPD):** Máscara automática (`000.000.000-00`) e validação matemática dos dois dígitos verificadores. O CPF nunca é salvo em texto puro — o servidor armazena apenas o hash irreversível **SHA-256** (`cpfHash`).
- **Armazenamento Interno com Retenção Máxima de 30 Dias:** Persistência em arquivo JSON estruturado (`rooms.json`) sem banco de dados externo, com limpeza automática após 30 dias e contador regressivo em tempo real no painel.
- **Exportação e Importação/Clonagem:**
  - **CSV (Excel PT-BR):** UTF-8 com BOM (`\uFEFF`) e separador `;`.
  - **JSON Completo:** Exporta configurações, metadados e respostas (omitindo `cpfHash`) para backup ou clonagem.
  - **Importação de Sala (`.json`):** Preenche automaticamente o formulário de criação com opções para manter ou limpar respostas existentes e manter ou renovar o PIN.

---

## Executando Localmente

### Pré-requisitos
- **Node.js 20+**

### Passos

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

Acesse `http://localhost:3000`.

---

## Deploy no GitHub + Railway (com Volume Persistente)

A aplicação já inclui `railway.json` configurado para o builder **NIXPACKS**, comando de inicialização `npm start` e verificação de saúde em `GET /api/health`.

### Passo 1: Subir o repositório para o GitHub

```bash
git init
git add .
git commit -m "feat: emoti-SAM Rooms pronto para produção"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/emoti-sam-rooms.git
git push -u origin main
```

### Passo 2: Criar o projeto no Railway

1. Acesse [railway.app](https://railway.app) e clique em **New Project** > **Deploy from GitHub repo**.
2. Selecione o repositório `emoti-sam-rooms`.
3. O Railway detectará automaticamente o `railway.json`, executará `npm run build` e iniciará o servidor com `npm start` (`NODE_ENV=production node server.js`).

### Passo 3: Acoplar o Volume Persistente (`/data`) no Railway

Como o armazenamento das salas é feito em arquivo (`rooms.json`) sem banco de dados externo, **é obrigatório acoplar um Volume no Railway** para que as salas não sejam perdidas a cada novo deploy ou reinício do container:

1. No painel do seu serviço no Railway, pressione **`Ctrl+K`** (ou `Cmd+K` no Mac) para abrir a paleta de comandos.
2. Selecione **`Add Volume`**.
3. No campo **Mount Path**, informe exatamente:
   ```
   /data
   ```
4. Confirme e aguarde o redeploy automático.
5. O Railway injetará automaticamente a variável `RAILWAY_VOLUME_MOUNT_PATH=/data`. Você pode confirmar que o volume está ativo acessando:
   ```
   https://seu-app.up.railway.app/api/health
   ```
   A resposta deve retornar `"persistentVolumeActive": true`.

---

## Referências Científicas

- **Hayashi, E. C. S., Posada, J. E. G., Maike, V. R. M. L., & Baranauskas, M. C. C. (2016).** *Exploring new formats of the Self-Assessment Manikin in the design with children.* Proceedings of IHC'16, SBC.
- **Bradley, M. M., & Lang, P. J. (1994).** *Measuring emotion: the Self-Assessment Manikin and the semantic differential.* Journal of Behavior Therapy and Experimental Psychiatry, 25(1), 49–59.
- **Oliveira, A. B. (2021).** *e-SAM: Uma Proposta de Solução para Apoiar a Avaliação do Estado Afetivo de Usuários na Interação com Sistemas Computacionais.* TCC, UNIPAMPA.
