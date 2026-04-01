// ================================================================
// AGENTE IA VASCO NEWS — comando.js
// Recebe instruções suas e as repassa ao agente
// Uso: POST /.netlify/functions/comando
// Body: { "instrucao": "sua instrução aqui", "tarefa": "instrucao" }
// ================================================================

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ erro: 'Use POST' }) };

  // Segurança: chave simples de acesso (configure AGENT_SECRET no Netlify)
  const AGENT_SECRET = process.env.AGENT_SECRET || '';
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}

  if (AGENT_SECRET && body.secret !== AGENT_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ erro: 'Acesso negado' }) };
  }

  const instrucao = body.instrucao || '';
  const tarefa = body.tarefa || 'instrucao';
  const contexto = body.contexto || {};

  if (!instrucao) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        info: 'Agente IA Vasco News — API de Comandos',
        uso: 'POST com { "instrucao": "sua instrução", "tarefa": "instrucao|noticias|boletim|pesquisa|analise", "secret": "sua_chave" }',
        exemplos: [
          { instrucao: 'Gere notícias focando na Sul-Americana', tarefa: 'instrucao' },
          { instrucao: 'O Vasco venceu o Coritiba por 2x1 — atualize as notícias', tarefa: 'noticias' },
          { instrucao: 'Gere análise do jogo de hoje', tarefa: 'analise' },
          { instrucao: 'Crie uma pesquisa sobre o próximo clássico', tarefa: 'pesquisa' },
          { instrucao: 'Gere o boletim de hoje com foco na Sul-Americana', tarefa: 'boletim' },
        ],
      }),
    };
  }

  try {
    const BASE_URL = process.env.SITE_URL || 'https://iavascodagama.netlify.app';
    const res = await fetch(`${BASE_URL}/.netlify/functions/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarefa, instrucao, contexto }),
    });

    const data = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        instrucao_recebida: instrucao,
        tarefa,
        ...data,
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
