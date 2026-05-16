/*
*PROJETO INTEGRADOR V - UNIVESP
*Monitoramento de motobomba de pivô central
*
*Objetivo: 
*   - Medir temperatura da carcaça (DS18B20).
*   - Medir vibração (MPU6050)
*   - Enviar dados via MQTT para análise preditiva.
*
*SIMULAÇÃO DE FALHA: 
*   Um botão físico multiplca o valor da vibração,
*   simulando o aumento causado por obstrução na sucção.
*
*AUTORA: Marcela Rodrigues Siqueira Sturaro
Data: 
*/


//===============================================================
// Inclusão de bibliotecas 
//===============================================================
//WiFi e MQTT
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>       //Cliente MQTT
#include <OneWire.h>            //Barramento 1-Wire (para o DSB18B20)
#include <DallasTemperature.h>  //Sensor DS18B20
#include <Wire.h>               //Comunicação I2C (para o MPU6050)
#include <MPU9250_asukiaaa.h>   //Sensor MPU6500 
#include "esp_task_wdt.h"

//===============================================================
//Habilita/dessbilita MQTT
//===============================================================
#define USAR_MQTT true

//===============================================================
// Credenciais
//===============================================================
#if USAR_MQTT
#include "config.h"
#endif

//===============================================================
// Definição dos pinos de conexão dos dispositivos
//===============================================================
#define ONE_WIRE_BUS 4        // Pino de dados DS18B20
#define BOTAO_SIMULACAO 15    // Botao ativar simulação de obstrução
#define LED_SIMULACAO 2       //Led onboard (GPIO2) - indica simulação ativa

// Obs: O MPU6050 uso o barramento I2C nos pinos fixos do ESP32:
//      SDA -> GPIO21, SCL -> GPIO22. Não é necessário #define, mas será
//      inicializado explicitamente no setup().

//===============================================================
// Objetos dos sensores e comunicação
//===============================================================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensorTemperatura(&oneWire);
MPU9250_asukiaaa sensorVibracao;
WiFiClientSecure clientWiFi;
PubSubClient clienteMQTT(clientWiFi);

//===============================================================
// Variáveis de controle de temporização
//===============================================================
unsigned long ultimoEnvio = 0;
const long intervaloEnvio = 30000;    // Envia dados a cada 30 segundos

//===============================================================
// Estado de simulação de falha
//===============================================================
bool falhaSimulada = false;     //Inicia desligada (operação normal)

//===============================================================
// Configuração inicial 
//===============================================================
void setup() {
  Serial.begin(115200);
  clientWiFi.setInsecure();
  delay(1000);
  Serial.println("Inicializando o sistema de monitoramento de motobomba...");

  //--- Configura e inicializa o Watchdog Timer (WDT) ---
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 10000,     // 10 segundos de timeout
    .trigger_panic = true,   //Se estourar, reeinicia a ESP
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);

  // --- Configuração dos pinos de entrada/saída ---
  pinMode(BOTAO_SIMULACAO, INPUT_PULLUP); //Pull-up interno: HIGH quando solto
  pinMode(LED_SIMULACAO, OUTPUT);
  digitalWrite(LED_SIMULACAO, LOW);

  // --- Incializa barramento I2C ---
  Wire.begin(21, 22);    // SDA = GPIO21, SCL = GPIO22
  sensorVibracao.setWire(&Wire);
  sensorVibracao.beginAccel();    //Inicializa acelerometro do MPU6500
  Serial.println("MPU6500 inicializado");

  // --- Inicializa o senor de temperatura ---
  sensorTemperatura.begin();
  Serial.println("DS18B20 inicializado.");

  // --- Conexão wi-Fi e MQTT ---
  #if USAR_MQTT
  conectarWiFi();
  clienteMQTT.setServer(mqtt_server, mqtt_port);
  #endif
}

//===============================================================
// Conecta à rede Wi-Fi
//===============================================================
#if USAR_MQTT
void conectarWiFi() {
  delay(10);
  Serial.print("Conectando ao Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    esp_task_wdt_reset();  //Reseta o watchdog para evitar reinicialização durante a conexão
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi conectado!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());
}
#endif

//===============================================================
// Reconecta ao broker MQTT (caso a conexão caia)
//===============================================================
#if USAR_MQTT
void reconectarMQTT() {
  while (!clienteMQTT.connected()) {
    esp_task_wdt_reset();    //Reseta o watchdog durante a reconexão
    Serial.print("Conectando ao broker MQTT...");
    //Gera um ID único para este cliente
    String idCliente ="ESP32-motobomba-" + String(random(0xffff), HEX);
    if (clienteMQTT.connect(idCliente.c_str(), mqtt_usr, mqtt_password)) {
      Serial.println("conectado!");
    } else {
      Serial.print("falhou, estado = ");
      Serial.print(clienteMQTT.state());
      Serial.println(" nova tentativa em 5 segundos");
      delay(5000);
    }
  }
}
#endif

//===============================================================
// Cálculo da intensidade da vibração (magnitude)
//===============================================================
// O MPU6050 fornece aceleração nos três eixos (x, y, z).
// Para ter uma única medida representativa da vibração,
//calculamos a magnitude do vetor: sqrt(x² + y² + z²).
//Quanto maior o valor, mais intensa é a vibração.
float calcularVibracao() {
  if (sensorVibracao.accelUpdate() == 0) {
    float x = sensorVibracao.accelX();
    float y = sensorVibracao.accelY();
    float z = sensorVibracao.accelZ();
    
    // Calcula a magnitude
    float magnitude = sqrt(x*x + y*y + z*z);
    return magnitude;
  } else {
    Serial.println("Falha na leitura do MPU6500");
    return 0;
  }
}

//===============================================================
// Loop principal
//===============================================================
void loop() {
  esp_task_wdt_reset();    // Reseta o watchdog em toda iteração do loop
  // --- Mantem as conexões ativas ---
  #if USAR_MQTT
  if (WiFi.status() != WL_CONNECTED) conectarWiFi();
  if (!clienteMQTT.connected()) reconectarMQTT();
  clienteMQTT.loop();
  #endif

  // --- Verifica se o botão de simulação foi pressionado ----
  if (digitalRead(BOTAO_SIMULACAO) == LOW) {
    falhaSimulada = !falhaSimulada;
    digitalWrite(LED_SIMULACAO, falhaSimulada ? HIGH : LOW);
    Serial.print("Simulação de obstrução ");
    Serial.println(falhaSimulada ? "ATIVADA" : "DESATIVADA");
    delay(250);   // Debounce simple para evitar leituras multiplas 
  }

  //  --- Envio periódico dos dados ---
  unsigned long agora = millis();
  if (agora - ultimoEnvio > intervaloEnvio) {
    ultimoEnvio = agora;

    //Leitura dos sensores (valores reais)
    sensorTemperatura.requestTemperatures();
    float temperaturaReal = sensorTemperatura.getTempCByIndex(0);
    float vibracaoReal = calcularVibracao();

    
    // Se a simulação estiver ativa, multipica-se o valor da vibração
    float temperaturaEnviar = temperaturaReal;
    float vibracaoEnviar = vibracaoReal;
    if (falhaSimulada) {
      vibracaoEnviar = vibracaoReal * 10.0;
      Serial.println("--- SIMULAÇÃO ATIVA ---");
      Serial.print("Vibração real: "); Serial.println(vibracaoReal);
      Serial.print("Vibração enviada: "); Serial.println(vibracaoEnviar);
    }

    // Converte os números para string (dtostrf) e publica nos tópicos MQTT
    char tempStr[10];
    char vibStr[10];
    dtostrf(temperaturaEnviar, 6, 2, tempStr);
    dtostrf(vibracaoEnviar, 6, 2, vibStr);

    #if USAR_MQTT
    clienteMQTT.publish(topicoTemperatura, tempStr);
    clienteMQTT.publish(topicoVibracao, vibStr);
    #endif

    //Log 
    Serial.print("Dados enviados -> Temperatura: ");
    Serial.print(temperaturaEnviar);
    Serial.print(" °C, Vibração: ");
    Serial.println(vibracaoEnviar);
  }

  delay(100); //Pequena pausa para evitar watchdog e estabilizar leituras
}


















