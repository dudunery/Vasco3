// ================================================================
// AGENTE IA VASCO NEWS — scheduled.js
// Tarefas automáticas agendadas via Netlify Scheduled Functions
// ================================================================
// Configuração no netlify.toml:
//   [functions."scheduled"]
//   schedule = "0 11 * * *"   ← 08h00 BRT (11h UTC)
// ================================================================

exports.handler = async (event) => {
  const agora = new Date();
  const brt = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hora = brt.getHours();
  const minuto = brt.getMinutes();
  const diaSemana = brt.getDay(); // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab

  const BASE_URL = process.env.SITE_URL || 'https://iavascodagama.netlify.app';
  const BREVO_KEY = process.env.BREVO_API_KEY || '';
  const BREVO_LIST_ID = parseInt(process.env.BREVO_LIST_ID || '2');

  const log = (msg) => console.log(`[${brt.toLocaleString('pt-BR')}] ${msg}`);
  const resultados = [];

  log('🤖 Agente acordou — verificando tarefas...');

  // ── TAREFA 1: Boletim diário às 8h ───────────────────────────
  if (hora === 8 && minuto < 10) {
    log('📧 Executando: Boletim diário das 8h');
    try {
      const res = await chamarAgente(BASE_URL, 'boletim', '', {});
      if (res.ok && BREVO_KEY) {
        await enviarBrevo(BREVO_KEY, BREVO_LIST_ID, res.resultado, brt);
        log('✅ Boletim enviado via Brevo');
        resultados.push({ tarefa: 'boletim', status: 'enviado' });
      } else {
        log('⚠️ Boletim gerado mas Brevo não configurado');
        resultados.push({ tarefa: 'boletim', status: 'gerado_sem_envio', dados: res.resultado });
      }
    } catch (e) {
      log(`❌ Erro no boletim: ${e.message}`);
      resultados.push({ tarefa: 'boletim', status: 'erro', erro: e.message });
    }
  }

  // ── TAREFA 2: Nova pesquisa toda segunda-feira às 9h ──────────
  if (diaSemana === 1 && hora === 9 && minuto < 10) {
    log('📊 Executando: Nova pesquisa semanal');
    try {
      const semanaAtual = Math.ceil(brt.getDate() / 7) + (brt.getMonth() * 4);
      const res = await chamarAgente(BASE_URL, 'pesquisa', '', { semana: semanaAtual });
      log('✅ Nova pesquisa gerada');
      resultados.push({ tarefa: 'pesquisa', status: 'gerada', dados: res.resultado });
    } catch (e) {
      log(`❌ Erro na pesquisa: ${e.message}`);
      resultados.push({ tarefa: 'pesquisa', status: 'erro', erro: e.message });
    }
  }

  // ── TAREFA 3: Resultado parcial da pesquisa (quarta às 12h) ──
  if (diaSemana === 3 && hora === 12 && minuto < 10) {
    log('📊 Publicando resultado parcial da pesquisa');
    resultados.push({ tarefa: 'resultado_parcial', status: 'publicado' });
  }

  // ── TAREFA 4: Resultado final da pesquisa (domingo às 20h) ───
  if (diaSemana === 0 && hora === 20 && minuto < 10) {
    log('📊 Publicando resultado final da pesquisa');
    resultados.push({ tarefa: 'resultado_final', status: 'publicado' });
  }

  // ── TAREFA 5: Análise semanal (domingo às 22h) ────────────────
  if (diaSemana === 0 && hora === 22 && minuto < 10) {
    log('📈 Gerando análise semanal');
    try {
      const res = await chamarAgente(BASE_URL, 'analise', '', {});
      log('✅ Análise gerada');
      resultados.push({ tarefa: 'analise', status: 'gerada', dados: res.resultado });
    } catch (e) {
      resultados.push({ tarefa: 'analise', status: 'erro', erro: e.message });
    }
  }

  if (resultados.length === 0) {
    log('😴 Nenhuma tarefa agendada para este momento.');
    resultados.push({ tarefa: 'nenhuma', status: 'aguardando' });
  }

  log(`✅ Concluído. ${resultados.length} tarefa(s) processada(s).`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      agente: 'IA Vasco News Scheduler',
      hora_brt: brt.toLocaleString('pt-BR'),
      resultados,
    }),
  };
};

// ── Helper: chama o agente principal ─────────────────────────
async function chamarAgente(baseUrl, tarefa, instrucao, contexto) {
  const res = await fetch(`${baseUrl}/.netlify/functions/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tarefa, instrucao, contexto }),
  });
  return await res.json();
}

// ── Helper: envia email via Brevo ─────────────────────────────
async function enviarBrevo(apiKey, listId, boletimData, data) {
  const assunto = boletimData?.assunto || `⚓ Boletim Vascaíno — ${data.toLocaleDateString('pt-BR')}`;
  const htmlContent = boletimData?.html || '<p>Boletim do dia</p>';

  const res = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Boletim ${data.toLocaleDateString('pt-BR')}`,
      subject: assunto,
      sender: { name: 'IA Vasco News', email: process.env.BREVO_SENDER_EMAIL || 'boletim@iavasconews.com.br' },
      type: 'classic',
      htmlContent,
      recipients: { listIds: [listId] },
      scheduledAt: new Date(Date.now() + 60000).toISOString(), // envia em 1 min
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API: ${err}`);
  }
  return await res.json();
}
