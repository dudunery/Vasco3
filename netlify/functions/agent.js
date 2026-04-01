// ================================================================
// AGENTE IA VASCO NEWS — agent.js
// Orquestrador principal — recebe instruções e coordena tarefas
// Deploy: Netlify Functions
// ================================================================

const INSTRUCOES_URL = process.env.INSTRUCOES_URL || '';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 200, headers, body: JSON.stringify({ erro: 'ANTHROPIC_API_KEY não configurada' }) };
  }

  // Lê o body da requisição
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}

  const tarefa = body.tarefa || 'noticias'; // noticias | boletim | pesquisa | instrucao
  const instrucaoUsuario = body.instrucao || '';
  const contexto = body.contexto || {};

  // Carrega as instruções do arquivo instrucoes.json (via GitHub raw ou variável)
  let instrucoes = getInstrucoesDefault();
  try {
    if (INSTRUCOES_URL) {
      const res = await fetch(INSTRUCOES_URL);
      if (res.ok) instrucoes = await res.json();
    }
  } catch (e) { /* usa default */ }

  // ── Monta o system prompt do agente ──────────────────────────
  const systemPrompt = buildSystemPrompt(instrucoes, tarefa);

  // ── Monta a mensagem do usuário ───────────────────────────────
  const userMessage = buildUserMessage(tarefa, instrucaoUsuario, contexto, instrucoes);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = await response.json();
    const texto = data.content?.map(c => c.text || '').join('') || '';

    // Tenta parsear como JSON se for tarefa estruturada
    let resultado = { raw: texto };
    try {
      const clean = texto.replace(/```json|```/g, '').trim();
      resultado = JSON.parse(clean);
    } catch (e) { resultado = { texto } }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        tarefa,
        resultado,
        agente: instrucoes.identidade?.nome || 'Agente IA Vasco News',
        timestamp: new Date().toISOString(),
      }),
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, erro: err.message }),
    };
  }
};

// ── System Prompt dinâmico ────────────────────────────────────
function buildSystemPrompt(instrucoes, tarefa) {
  const id = instrucoes.identidade || {};
  const specs = instrucoes.instrucoes_especiais || [];
  const jogo = instrucoes.jogo_destaque || {};

  const tomDesc = {
    passional: 'apaixonado e empolgante como torcedor vascaíno raiz',
    jornalistico: 'jornalístico, profissional e objetivo',
    analitico: 'analítico, tático e baseado em dados',
  }[id.tom || 'passional'];

  return `Você é o ${id.nome || 'Agente IA Vasco News'} — ${id.descricao || 'agente autônomo do portal IA Vasco News'}.

TOM: ${tomDesc}.
IDIOMA: Português do Brasil (pt-BR).

FATOS VERIFICADOS 2026 — NUNCA INVENTE DADOS:
- Técnico: Renato Gaúcho (3ª passagem, desde 03/03/2026)
- Brasileirão R8 (última rodada): 3V 2E 3D, 11 pontos, 9° lugar
- Resultados: R1 Mirassol 2x1 Vasco | R2 Vasco 1x1 Chapecoense | R3 Vasco 0x1 Bahia | R4 Vasco 1x2 Santos | R5 Vasco 2x1 Palmeiras | R6 Vasco 3x3 Cruzeiro | R7 Vasco 3x2 Fluminense | R8 Vasco 2x1 Grêmio
- Próximo jogo: ${jogo.adversario || 'Coritiba'} x Vasco — ${jogo.data || '01/04'} ${jogo.hora || '20h30'} — ${jogo.estadio || 'Couto Pereira'}
- TV: ${jogo.tv || 'sportv, Premiere'} | Internet: ${jogo.internet || 'Globoplay, Premiere Play'}
- Alertas: ${(jogo.alertas || []).join(', ')}
- Títulos corretos: Brasileiro 1974, 1989, 1997, 2000 | Libertadores 1998 | Copa do Brasil 2011

REGRAS OBRIGATÓRIAS:
${specs.map((s, i) => `${i + 1}. ${s}`).join('\n')}

TAREFA ATUAL: ${tarefa}

Responda APENAS com JSON válido (sem markdown, sem explicações fora do JSON).`;
}

// ── User Message por tarefa ───────────────────────────────────
function buildUserMessage(tarefa, instrucaoUsuario, contexto, instrucoes) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const esportes = instrucoes.noticias?.esportes_ativos || ['futebol', 'basquete', 'remo', 'beach', 'futsal', 'feminino', 'base', 'clube'];

  const baseMsg = instrucaoUsuario
    ? `Instrução do usuário: "${instrucaoUsuario}"\n\n`
    : '';

  const tasks = {
    noticias: `${baseMsg}Hoje é ${hoje} às ${hora}. Gere 14 notícias DIFERENTES e atuais sobre o Vasco da Gama.

Distribuição obrigatória por esporte: futebol (6), basquete (1), remo (1), beach soccer (1), futsal (1), feminino (1), base (1), clube/SAF (2).

Fontes: netvasco.com.br, supervasco.com, vasco.com.br, crvascodagama.com, lance.com.br, ge.globo.com
Redes sociais: @vascodagama (Twitter/X), @vascodagama (Instagram) — sempre citar fonte.
SEM imagens. Apenas texto.

Responda APENAS com JSON válido:
{"news":[{"id":"n001","sport":"futebol","cat":"PRÉ-JOGO","title":"título","excerpt":"resumo 1 linha","body":"<p>parágrafo</p>","src":"fonte.com.br","srcUrl":"https://fonte.com.br","srcType":"site","date":"${hoje}","time":"${hora}","fresh":true}]}
srcType pode ser: site, twitter, instagram`,

    boletim: `${baseMsg}Hoje é ${hoje}. Gere o boletim diário do Vasco da Gama.

Inclua: próximo jogo (com TV e internet), 3 destaques do dia, resultado anterior, pesquisa da semana, quiz do dia.

Responda com JSON:
{"boletim":{"assunto":"título do email","html":"<html>conteúdo completo em HTML</html>","resumo":"versão texto simples"}}`,

    pesquisa: `${baseMsg}Hoje é ${hoje}. Gere uma nova pesquisa semanal sobre o Vasco.

Contexto: ${JSON.stringify(contexto)}

Responda com JSON:
{"pesquisa":{"semana":14,"pergunta":"pergunta aqui","opcoes":["op1","op2","op3","op4"],"justificativa":"por que esta pergunta é relevante agora"}}`,

    instrucao: `${baseMsg}

Contexto atual do site: ${JSON.stringify(contexto)}

Execute a instrução do usuário acima e retorne o resultado em JSON:
{"acao_executada":"descrição","resultado":"o que foi feito","dados_atualizados":{},"proxima_acao_sugerida":"sugestão opcional"}`,

    analise: `${baseMsg}Analise o desempenho atual do Vasco e gere um relatório.

Responda com JSON:
{"analise":{"forma":"análise da forma atual","proximo_jogo":"análise do próximo desafio","mercado":"movimentações relevantes","torcida":"sentimento geral","nota_geral":8.5,"destaques":["destaque1","destaque2"]}}`,
  };

  return tasks[tarefa] || tasks.instrucao;
}

// ── Instruções default (se instrucoes.json não carregar) ──────
function getInstrucoesDefault() {
  return {
    identidade: { nome: 'Agente IA Vasco News', tom: 'passional' },
    noticias: { esportes_ativos: ['futebol', 'basquete', 'remo', 'beach', 'futsal', 'feminino', 'base', 'clube'] },
    instrucoes_especiais: [
      'Sempre verificar resultados em vaskipedia.com',
      'Nunca inventar placares',
      'Citar sempre a fonte',
    ],
    jogo_destaque: {
      adversario: 'Coritiba', data: '01/04/2026', hora: '20h30',
      estadio: 'Couto Pereira, Curitiba', tv: 'sportv, Premiere',
      internet: 'Globoplay, Premiere Play',
      alertas: ['Andres Gomez suspenso'],
    },
  };
}
