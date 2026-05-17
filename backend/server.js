const express = require("express");
const cors = require("cors");          // 
require("dotenv").config();
const mqtt = require("mqtt");
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

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
//DETECTA AMBIENTE DE TESTE
// ===========================================
const modoTeste = process.env.NODE_ENV =='test';

// ===========================================
// CONNFIGURAÇÕES REAIS (APENAS FORA DO TESTE)
// ===========================================
let mqttClient;
let writeApi;

if (!modoTeste) {

  // ------------ MQTT------------
  mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
    port: Number(process.env.MQTT_PORT),
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
  });

  mqttClient.on("connect", () => {
    mqttClient.subscribe(process.env.MQTT_TOPIC_TEMPERATURA);
    mqttClient.subscribe(process.env.MQTT_TOPIC_VIBRACAO);
    console.log("Backend conectado ao MQTT");
  });

  mqttClient.on("message", (topic, message) => {
    const valor = parseFloat(message.toString());

    // --- Temperatura ---
    if (topic === process.env.MQTT_TOPIC_TEMPERATURA) {
      dados.temperatura.push({valor, data: new Date().toISOString() });
      if (dados.temperatura.length > MAX_PONTOS) dados.temperatura.shift();

      console.log("Temp:", valor);

      const pointTemp = new Point("temperatura").floatField("valor", valor);
      writeApi.writePoint(pointTemp);
    } 
  
    // --- Vibração --
    if (topic === process.env.MQTT_TOPIC_VIBRACAO) {    
       dados.vibracao.push({ valor, data: new Date().toISOString()});
       if (dados.vibracao.length > MAX_PONTOS) dados.vibracao.shift();

       console.log("Vibração:", valor);

       const pointVib = new Point("vibracao").floatField("valor", valor);
       writeApi.writePoint(pointVib);
     }
   });
  
   //------------InfluxDB------------
   const influxDB = new InfluxDB({ url: process.env.INFLUX_URL, token: process.env.INFLUX_TOKEN });
   writeApi = influxDB.getWriteApi(process.env.INFLUX_ORG, process.env.INFLUX_BUCKET, 'ns');
}

// ===========================================
// API
// ===========================================
app.get("/dados", (req, res) => {
  res.json(dados);
});

// ===========================================
// EXPORTA O APP PARA TESTES
// ===========================================
module.exports = app;

// ===========================================
// INICIALIZAÇÃO
// ===========================================
if (require.main == module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log("Backend rodando na porta", PORT);
  });
}