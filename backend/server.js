const express = require("express");
require("dotenv").config();
const mqttClient = require("./mqtt");

const app = express();
app.use(express.json());

//memória temporária (depois vai pro influxDB)
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


  if (topic === process.env.MQTT_TOPIC_TEMPERATURA) {
  dados.temperatura.push({ valor, data: new Date() });
  console.log("Temp:", valor);
  }

  if (topic === process.env.MQTT_TOPIC_VIBRACAO) {
  dados.vibracao.push({ valor, data: new Date() });
  console.log("Vibração:", valor);
  }
});

// ===========================================
//API
// ===========================================
app.get("/dados", (req, res) => {
  res.json(dados);
});

app.listen(process.env.PORT, () => {
  console.log("Backend rodando na porta", process.env.PORT);
});

