const express = require("express");
const router = express.Router();
const axios = require("axios");

const { processAudio } = require("../services/audioProcessorService");

router.post("/process-audio", async (req, res) => {
  try {
    const url = req.body.url;
    const result = await processAudio(url);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando audio" });
  }
});

router.post("/convert-text", async (req, res) => {
  try {
    const text = req.body.text;
    console.log("text", text);
    const result = await convertToHtml(text);

    console.log("result", result);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando el texto" });
  }
});

async function convertToHtml(text) {
  try {
    const instruction =
      "Eres un programador experto con conocimientos en HTML y la plantilla Skeleton UI. Tu tarea es no solo transformar el texto dado en HTML, sino hacerlo de tal manera que asegure una buena experiencia de usuario, dividiendo el texto en secciones claras, utilizando los titulares correspondientes para cada parte. Sé creativo en tu enfoque para generar un resultado visualmente atractivo y funcionalmente efectivo.\n";

    // const expectedFormat =
    //   "# Expected Format:\n" +
    //   "Dada una solicitud de usuario como esta:\n" +
    //   "Transforma este texto a HTML:\n" +
    //   "- <texto a transformar>\n" +
    //   "Responde con la transformación:\n" +
    //   "- <texto transformado en HTML>";

    const exampleText =
      "En el video, se plantea la idea de que en Estados Unidos hay un cambio constante de partidos políticos, pero la política pública no cambia realmente. Se compara esto con China, donde el Partido Comunista se mantiene en el poder, pero la política pública experimenta cambios revolucionarios. Se plantea la pregunta de dónde hay más democracia y libertad. Se menciona que en China, a pesar de la apertura al mercado internacional, no hay forma de que los capitalistas dominen al Partido Comunista. En cambio, en Estados Unidos, se sugiere que los oligarcas y capitalistas tienen un gran control sobre la política. Se destaca la influencia de los grupos de interés y la legalización del lobby en Estados Unidos. En contraste, en China, las empresas y magnates pueden ser restringidos por el partido si no representan los intereses del proletariado. Se subraya que en China, aunque existe un mercado próspero, el poder del capital no puede sobreponerse al poder político del Partido Comunista.";

    const exampleHtml = `
    <h1>Análisis del video</h1>
    <p>En el video, se plantea la idea de que en Estados Unidos hay un cambio constante de partidos políticos, pero la política pública no cambia realmente. Se compara esto con China, donde el Partido Comunista se mantiene en el poder, pero la política pública experimenta cambios revolucionarios.</p>
    <h2>¿Dónde hay más democracia y libertad?</h2>
    <p>Se plantea la pregunta de dónde hay más democracia y libertad.</p>
    <h2>Comparación entre China y Estados Unidos</h2>
    <p>Se menciona que en China, a pesar de la apertura al mercado internacional, no hay forma de que los capitalistas dominen al Partido Comunista. En cambio, en Estados Unidos, se sugiere que los oligarcas y capitalistas tienen un gran control sobre la política.</p>
    <h2>Influencia de los grupos de interés y la legalización del lobby en Estados Unidos</h2>
    <p>Se destaca la influencia de los grupos de interés y la legalización del lobby en Estados Unidos. En contraste, en China, las empresas y magnates pueden ser restringidos por el partido si no representan los intereses del proletariado.</p>
    <h2>El poder del capital en China</h2>
    <p>Se subraya que en China, aunque existe un mercado próspero, el poder del capital no puede sobreponerse al poder político del Partido Comunista.</p>
    `;

    const expectedFormat =
      "# Expected Format:\n" +
      "Dada una solicitud de usuario como esta:\n" +
      "Transforma este texto a HTML:\n" +
      `- ${exampleText}\n` +
      "Responde con la transformación:\n" +
      `- ${exampleHtml}\n`;

    // gpt-3.5-turbo-16k
    const GPT_MODEL = "gpt-4";

    const payload = {
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: instruction + expectedFormat,
        },
        {
          role: "user",
          content: text,
        },
      ],
    };
    const config = {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    };
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      config
    );
    return response.data["choices"][0]["message"]["content"];
  } catch (error) {
    console.error(
      "Error en convertToHtml:",
      error.response ? error.response.data : error.message
    );
  }
}

module.exports = router;
