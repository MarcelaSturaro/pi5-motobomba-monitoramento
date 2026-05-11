const mqtt = require("mqtt");
require("dotenv").config();

const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}`, {
  port: process.env.MQTT_PORT,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
});

client.on("connect", () => {
  console.log("MQTT conectado");

  client.subscribe("#", () => {
    console.log("Inscrito em todos os Tópicos");
  });
});

client.on("error", (err) => {
  console.log("Erro MQTT: ", err.message);
});

module.exports = client;