// netlify/functions/noticias.js
// Servidor seguro que chama Claude AI com a chave protegida
// Deployar no Netlify com ANTHROPIC_API_KEY como variável de ambiente

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "seed", news: [] }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const tone = body.tone || "passional";
  const today = new Date().toLocaleDateString("pt-BR");

  const toneDesc =
    tone === "passional"
      ? "apaixonado e empolgante como torcedor vascaino"
      : tone === "jornalistico"
      ? "jornalistico profissional e objetivo"
      : "analitico e tactico";

  const prompt = `Voce e o motor de noticias do portal fan site do Vasco da Gama (nao-oficial).
Hoje e ${today}. Gere EXATAMENTE 14 noticias DIFERENTES e atuais sobre o Vasco da Gama,
cobrindo TODOS estes esportes: futebol (6), basquete (1), remo (1), beach soccer (1), futsal (1), feminino (1), base (1), clube/SAF (2).

FATOS VERIFICADOS 2026:
- Tecnico: Renato Gaucho (3a passagem, desde 03/03/2026)
- Brasileirao 2026 Serie A - Resultados ate R8:
  * R1 (29/01): Vasco 1x2 Mirassol
  * R2 (08/02): Vasco 1x1 Chapecoense
  * R3 (14/02): Vasco 0x1 Bahia
  * R4 (26/02): Vasco 1x2 Santos
  * R5 (12/03): Vasco 2x1 Palmeiras
  * R6 (15/03): Vasco 3x3 Cruzeiro
  * R7 (18/03): Vasco 3x2 Fluminense
  * R8 (22/03): Vasco 2x1 Gremio
- Classificacao: 9o lugar, 11 pontos, 3V 2E 3D em 8 jogos
- Proximo jogo R9: 01/04 Coritiba x Vasco, 20h30, Couto Pereira, sportv+Premiere
- R10: 04/04 Vasco x Botafogo, 21h, Sao Januario - INGRESSOS ESGOTADOS
- Sul-Americana Grupo G: Barracas Central(ARG), Audax Italiano(CHI), Olimpia(PAR)
- Sul-Am R1: 07/04 Barracas x Vasco, 19h, Claudio Fabian Tapia Stadium, Buenos Aires
- Andres Gomez: SUSPENSO para o Coritiba
- Cuiabano: duvida, monitorado por Bayer Leverkusen e Borussia Dortmund
- Artilheiros 2026: Thiago Mendes 3, Barros 3, Puma 3, Spinelli 3, Coutinho 3
- TITULOS CORRETOS: Brasileiro 1974, 1989, 1997, 2000
- Basquete: Vasco x Paulistano hoje 20h em Sao Januario, NBB
- Remo: 7 medalhas no Sul-Americano Porto Alegre
- Beach Soccer Fem: melhor jogadora, goleira e treinadora Copa do Brasil

Buscar fontes: netvasco.com.br, supervasco.com, vasco.com.br, crvascodagama.com, lance.com.br
Redes sociais: @vascodagama (Twitter/X), @vascodagama (Instagram)
Sempre citar a fonte.
Tom: ${toneDesc}.

Responda APENAS com JSON valido (sem markdown):
{"news":[{"id":"n001","sport":"futebol","cat":"PRE-JOGO","title":"titulo","excerpt":"resumo 1 linha","body":"<p>paragrafo</p><p>paragrafo2</p>","src":"fonte.com.br","srcUrl":"https://fonte.com.br","srcType":"site","date":"${today}","time":"HH:MM","fresh":true}]}
Esportes validos: futebol, basquete, remo, beach, futsal, feminino, base, clube.
srcType pode ser: site, twitter, instagram, youtube`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "ai", news: parsed.news || [] }),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ source: "error", news: [], error: err.message }),
    };
  }
};
