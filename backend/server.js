const express = require("express");
const cors = require("cors");          // 
require("dotenv").config();
const mqttClient = require("./mqtt");
const { writeApi, Point } = require("./influx");

const app = express();

// ===========================================
// MIDDLEWARES
// ===========================================
app.use(cors());                       //  habilita CORS para qualquer origem
app.use(express.json());

// ===========================================
// MEMÓRIA TEMPORÁRIA (limitada)
// ===========================================
const MAX_PONTOS = 100;                // mantém apenas os últimos 100 pontos
let dados = {
  temperatura: [],
  vibracao: []
};

// ===========================================
// MQTT SUBSCRIBE
// ===========================================
mqttClient.on("connect", () => {
  mqttClient.subscribe(process.env.MQTT_TOPIC_TEMPERATURA);
  mqttClient.subscribe(process.env.MQTT_TOPIC_VIBRACAO);
  console.log("Backend conectado ao MQTT");
});

mqttClient.on("message", (topic, message) => {
  const valor = parseFloat(message.toString());

  // --- Temperatura ---
  if (topic === process.env.MQTT_TOPIC_TEMPERATURA) {
    dados.temperatura.push({
      valor,
      data: new Date().toISOString()
    });
    // Mantém apenas os últimos MAX_PONTOS
    if (dados.temperatura.length > MAX_PONTOS) dados.temperatura.shift();

    console.log("Temp:", valor);

    const pointTemp = new Point("temperatura")
      .floatField("valor", valor);
    writeApi.writePoint(pointTemp);
  }

  // --- Vibração ---
  if (topic === process.env.MQTT_TOPIC_VIBRACAO) {
    dados.vibracao.push({
      valor,
      data: new Date().toISOString()
    });
    if (dados.vibracao.length > MAX_PONTOS) dados.vibracao.shift();

    console.log("Vibração:", valor);

    const pointVib = new Point("vibracao")
      .floatField("valor", valor);
    writeApi.writePoint(pointVib);
  }
});

// ===========================================
// API
// ===========================================
app.get("/dados", (req, res) => {
  res.json(dados);
});

// ===========================================
// INICIALIZAÇÃO
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend rodando na porta", PORT);
});