const axios = require("axios");
const { EventEmitter } = require("events");
const segmentDuration = 300;

const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");

const audioPath = "/tmp/audio.mp3";
const progress = new EventEmitter();

const FormDataNew = require("form-data");

const GPT_MODEL = "gpt-4";
// const GPT_MODEL = "gpt-4";

async function downloadAudio(url) {
  return new Promise((resolve, reject) => {
    console.log("Iniciando descarga del audio de YouTube...");
    ytdl(url, { filter: "audioonly" })
      // .on("error", reject)
      .on("error", () => {
        console.log("Error en downloadAudio");
        console.log("url:", url);
        console.log("audioPath:", audioPath);
        console.log("reject:", reject);
        reject();
      })
      .pipe(fs.createWriteStream(audioPath))
      // .on("finish", resolve);
      .on("finish", () => {
        console.log("Descarga finalizada");
        console.log("resolve:", resolve);

        resolve();
      });
  });
}

function processAudioSegment(segmentPath, start) {
  return new Promise((resolve, reject) => {
    console.log(`Procesando el segmento desde el segundo ${start}...`);
    ffmpeg(audioPath)
      .setStartTime(start)
      .setDuration(segmentDuration)
      .output(segmentPath)
      .on("end", () => resolve(segmentPath))
      .on("error", reject)
      .run();
  });
}

async function getAudioMetadata() {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
}

async function generateSummary(prompt, transcription) {
  try {
    console.log("process.env.OPENAI_API_KEY", process.env.OPENAI_API_KEY);

    const payload = {
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: transcription,
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

    progress.emit("progress", {
      stage: "summaryGenerated",
      data: response.data["choices"][0]["message"]["content"],
    });

    return response.data["choices"][0]["message"]["content"];
  } catch (error) {
    console.error(
      "Error en generateSummary:",
      error.response ? error.response.data : error.message
    );
  }
}

async function generateHighlights(prompt, summaries) {
  try {
    const combinedSummaries = summaries
      .map(s => `Segmento ${s.segment}: ${s.summary}`)
      .join("\n\n");

    const payload = {
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: combinedSummaries,
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
      "Error en generateHighlights:",
      error.response ? error.response.data : error.message
    );
  }
}

function transcribeAudio(segmentPath) {
  try {
    // let data = new FormData();
    let data = new FormDataNew();
    data.append("file", fs.createReadStream(segmentPath));
    data.append("model", "whisper-1");
    const config = {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...data.getHeaders(),
      },
    };
    return axios
      .post("https://api.openai.com/v1/audio/transcriptions", data, config)
      .then(response => response.data.text)
      .finally(() => fs.unlink(segmentPath, console.error));
  } catch (error) {
    console.error(
      "Error en transcribeAudio:",
      error.response ? error.response.data : error.message
    );
  }
}

async function processAudio(url) {
  await downloadAudio(url);
  const duration = await getAudioMetadata();
  const promises = [];

  for (let start = 0; start < duration; start += segmentDuration) {
    // const segmentPath = `segment-${start}.mp3`;
    const segmentPath = `/tmp/segment-${start}.mp3`;
    promises.push(
      processAudioSegment(segmentPath, start)
        .then(transcribeAudio)
        .catch(console.error)
    );
  }

  progress.emit("progress", { stage: "audioDownloaded", data: null });

  const transcriptions = await Promise.all(promises);

  progress.emit("progress", {
    stage: "audioTranscribed",
    data: transcriptions,
  });

  const promptSegment =
    "Toma la siguiente transcripción de video y destila las ideas más importantes en un lenguaje claro y conciso. Debe permitir entender el video tras una lectura rápida.";
  const summaries = [];

  for (let i = 0; i < transcriptions.length; i++) {
    const summary = await generateSummary(promptSegment, transcriptions[i]);
    summaries.push({ segment: i + 1, summary });
  }

  const promptHighlight =
    "A partir de los siguientes resúmenes, identifica y genera los cinco o seis puntos más importantes del video completo. Cada punto debe ser explicado en no más de cuatro a seis líneas.";

  const highlights = await generateHighlights(promptHighlight, summaries);
  console.log("Puntos destacados del video:", highlights);

  return { transcriptions, summaries, highlights };
}

module.exports = { processAudio };
