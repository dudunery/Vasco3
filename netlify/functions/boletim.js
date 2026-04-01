// netlify/functions/boletim.js
// Gera boletim diario e gerencia pesquisas semanais

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const today = new Date().toLocaleDateString("pt-BR");
  const dayOfWeek = new Date().getDay(); // 0=dom,1=seg...
  const weekNum = Math.ceil(new Date().getDate() / 7);

  if (!apiKey) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "static", bulletin: getStaticBulletin(today), poll: getWeeklyPoll(weekNum) }),
    };
  }

  try {
    const prompt = `Gere um boletim diario CONCISO para o fan site do Vasco da Gama em ${today}.
Inclua: jogo proximo, 3 destaques do dia, pesquisa da semana, quiz do dia.
Responda APENAS com HTML limpo (sem markdown, sem DOCTYPE).`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const html = data.content?.map((c) => c.text || "").join("") || getStaticBulletin(today);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: "ai",
        bulletin: html,
        poll: getWeeklyPoll(weekNum),
        date: today,
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        source: "static",
        bulletin: getStaticBulletin(today),
        poll: getWeeklyPoll(weekNum),
      }),
    };
  }
};

function getWeeklyPoll(week) {
  const polls = [
    { id: `poll_w${week}_1`, q: "Como voce avalia o Vasco nesta rodada?", opts: ["Excelente", "Bom", "Regular", "Fraco"] },
    { id: `poll_w${week}_2`, q: "Renato Gaucho esta fazendo um bom trabalho?", opts: ["Sim, otimo", "Sim, bom", "Regular", "Nao ainda"] },
    { id: `poll_w${week}_3`, q: "O Vasco vai vencer o proximo jogo?", opts: ["Sim, com folga", "Sim, por pouco", "Empate", "Derrota"] },
    { id: `poll_w${week}_4`, q: "Qual o maior destaque do Vasco em 2026?", opts: ["Cuiabano", "Coutinho", "Thiago Mendes", "Outro"] },
    { id: `poll_w${week}_5`, q: "Vasco vai classificar na Sul-Americana?", opts: ["Sim, facilmente", "Sim, com dificuldade", "Talvez", "Nao"] },
  ];
  return polls[week % polls.length];
}

function getStaticBulletin(today) {
  return `<div style="padding:4px 0">
    <div style="font-family:Oswald,sans-serif;font-size:.75rem;letter-spacing:2px;color:#E8C050;margin-bottom:10px;text-transform:uppercase">&#x26BD; Proximo Jogo</div>
    <div style="font-size:12px;color:#F2EFEA;line-height:1.7;margin-bottom:14px">
      <strong>Coritiba x Vasco</strong> — 01/04 as 20h30<br>
      Couto Pereira · Curitiba · R9 Brasileirao<br>
      <strong style="color:#F87171">Andres Gomez suspenso</strong> · Cuiabano em duvida
    </div>
    <div style="font-family:Oswald,sans-serif;font-size:.75rem;letter-spacing:2px;color:#E8C050;margin-bottom:10px;text-transform:uppercase">&#x1F4F0; Destaques do Dia</div>
    <div style="font-size:12px;color:#C8C5BE;line-height:1.7;margin-bottom:14px">
      &#x1F3C0; Basquete: Vasco x Paulistano 20h Sao Januario — NBB<br>
      &#x26F5; Remo: 7 medalhas no Sul-Americano em Porto Alegre<br>
      &#x1F4B0; SAF: Lamacchia avanca nas negociacoes
    </div>
    <div style="font-family:Oswald,sans-serif;font-size:.75rem;letter-spacing:2px;color:#E8C050;margin-bottom:10px;text-transform:uppercase">&#x1F4CA; Pesquisa da Semana</div>
    <div style="font-size:12px;color:#C8C5BE;line-height:1.7">
      Vote agora na pagina de Pesquisas e veja o resultado imediato!
    </div>
  </div>`;
}
