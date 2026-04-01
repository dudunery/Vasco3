# 🤖 GUIA DO AGENTE IA VASCO NEWS

## O que é o Agente

O agente é um sistema autônomo que cuida do site 24h — sem você precisar fazer nada. Ele usa a API do Claude (Anthropic) para pensar e agir.

---

## O que o Agente faz automaticamente

| Horário | Tarefa |
|---------|--------|
| **Todo dia às 8h** | Gera e envia o boletim diário por e-mail |
| **Toda segunda às 9h** | Cria nova pesquisa semanal |
| **Toda quarta às 12h** | Publica resultado parcial da pesquisa como notícia |
| **Todo domingo às 20h** | Publica resultado final da pesquisa |
| **Todo domingo às 22h** | Gera análise semanal do Vasco |
| **A cada 10 minutos** | Atualiza as notícias automaticamente |

---

## Como dar instruções ao Agente

### Opção 1 — Editar instrucoes.json (sem código)

1. Abra o arquivo `instrucoes.json` no GitHub
2. Edite os campos:
   - `"tom"` — mude entre `"passional"`, `"jornalistico"`, `"analitico"`
   - `"pesquisa_ativa"` — troque a pergunta da semana
   - `"jogo_destaque"` — atualize o próximo jogo
   - `"instrucoes_especiais"` — adicione regras permanentes
3. Clique em **Commit changes**
4. O agente seguirá as novas instruções na próxima execução

### Opção 2 — Enviar instrução via API (mais poderoso)

Faça uma requisição POST para:
```
https://SEU-SITE.netlify.app/.netlify/functions/comando
```

Com o body em JSON:
```json
{
  "instrucao": "O Vasco venceu o Coritiba por 2x1 — atualize as notícias e destaque os gols",
  "tarefa": "noticias",
  "secret": "SUA_CHAVE_SECRETA"
}
```

### Exemplos de instruções que você pode enviar

```json
{ "instrucao": "Gere notícias focando na Sul-Americana de amanhã", "tarefa": "instrucao" }
{ "instrucao": "Vasco ganhou 3x0 — atualize tudo com celebração", "tarefa": "noticias" }
{ "instrucao": "Crie pesquisa sobre quem vai marcar no clássico", "tarefa": "pesquisa" }
{ "instrucao": "Gere análise tática do jogo de hoje", "tarefa": "analise" }
{ "instrucao": "Boletim especial sobre o clássico de amanhã", "tarefa": "boletim" }
```

### Opção 3 — Via site (painel admin)

Acesse `seusite.netlify.app/admin` e edite os campos visualmente.

---

## Variáveis de ambiente necessárias no Netlify

Vá em **Site settings → Environment variables** e adicione:

| Variável | Valor | Obrigatória |
|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | ✅ Sim |
| `SITE_URL` | `https://iavascodagama.netlify.app` | ✅ Sim |
| `AGENT_SECRET` | Qualquer senha sua | ✅ Sim (protege o endpoint) |
| `BREVO_API_KEY` | Chave do Brevo | Para newsletter |
| `BREVO_LIST_ID` | ID da lista no Brevo | Para newsletter |
| `BREVO_SENDER_EMAIL` | Seu email remetente | Para newsletter |
| `INSTRUCOES_URL` | URL raw do instrucoes.json no GitHub | Opcional |

---

## Como testar o agente manualmente

Acesse no navegador (substitua pela URL do seu site):
```
https://SEU-SITE.netlify.app/.netlify/functions/comando
```

Isso mostra o menu de ajuda. Para enviar uma instrução, use o Postman, Insomnia ou qualquer ferramenta de API.

### Teste simples com curl (terminal):
```bash
curl -X POST https://SEU-SITE.netlify.app/.netlify/functions/comando \
  -H "Content-Type: application/json" \
  -d '{"instrucao":"Gere 3 notícias de futebol","tarefa":"noticias","secret":"SUA_CHAVE"}'
```

---

## Estrutura dos arquivos do agente

```
vasco-agente/
├── instrucoes.json              ← EDITE AQUI (sem código)
├── netlify.toml                 ← Configuração (não precisa editar)
└── netlify/functions/
    ├── agent.js                 ← Cérebro do agente
    ├── scheduled.js             ← Tarefas automáticas
    └── comando.js               ← Recebe suas instruções
```

---

## Fluxo completo

```
Você muda o instrucoes.json ou envia um POST
              ↓
      agent.js recebe a tarefa
              ↓
   Claude pensa com base nas instruções
              ↓
   Executa: gera notícias, boletim, pesquisa...
              ↓
   Site atualiza automaticamente
              ↓
   (se tiver Brevo) Envia e-mail para assinantes
```

---

## Custo estimado

| Uso | Custo por mês |
|-----|---------------|
| Notícias (10 em 10 min, 100 visitantes/dia) | ~$2–5 |
| Boletim diário | ~$0.50 |
| Pesquisas semanais | ~$0.10 |
| **Total estimado** | **~$3–6/mês** |

Preços da API Anthropic (claude-sonnet). Varia conforme o uso real.
