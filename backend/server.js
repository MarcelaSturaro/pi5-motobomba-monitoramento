const express = require("express");
require("dotenv").config();
const mqttClient = require("./mqtt");
const { writeApi, Point } = require("./influx");

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
  const pointTemp = new Point("temperatura")
    .floatField("valor", valor);

  writeApi.writePoint(pointTemp);
  
  }

  if (topic === process.env.MQTT_TOPIC_VIBRACAO) {
  dados.vibracao.push({ valor, data: new Date() });
  console.log("Vibração:", valor);
  const pointVib = new Point("vibracao")
    .floatField("valor", valor);
  writeApi.writePoint(pointVib);
  
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

