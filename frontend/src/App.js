import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import "chart.js/auto";
import VLibras from "react-vlibras";
import Chart from "./components/Chart";

function App() {
  const [temperatura, setTemperatura] = useState([]);
  const [vibracao, setVibracao] = useState([]);
  const [alertaVibracao, setAlertaVibracao] = useState(false);
  const [alertaTemperatura, setAlertaTemperatura] = useState(false);
  const [audioAtivado, setAudioAtivado] = useState(false);
  const ultimoAlertaVibRef = useRef(false);
  const ultimoAlertaTempRef = useRef(false);
  const audioPermitidoRef = useRef(false);

  const LIMITE_VIBRACAO = 5.0;
  const LIMITE_TEMPERATURA = 40.0;

  const falar = (mensagem) => {
    if (!audioPermitidoRef.current) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(mensagem);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.2;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const ativarAudio = () => {
    audioPermitidoRef.current = true;
    setAudioAtivado(true);
    if (alertaVibracao) falar("Atenção! Vibração alta na motobomba.");
    if (alertaTemperatura) falar("Cuidado! Temperatura da motobomba muito alta.");
    falar("Alerta sonoro ativado");
  };

  const fetchData = useCallback(async () => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3000";
    try {
      const response = await axios.get(`${apiUrl}/dados`);
      setTemperatura([...response.data.temperatura]);
      setVibracao([...response.data.vibracao]);

      const ultVib = response.data.vibracao.length > 0
        ? response.data.vibracao[response.data.vibracao.length - 1].valor
        : 0;
      const novoAlertaVib = ultVib > LIMITE_VIBRACAO;
      if (novoAlertaVib !== ultimoAlertaVibRef.current) {
        if (novoAlertaVib) falar("Atenção! Vibração alta na motobomba.");
        ultimoAlertaVibRef.current = novoAlertaVib;
      }
      setAlertaVibracao(novoAlertaVib);

      const ultTemp = response.data.temperatura.length > 0
        ? response.data.temperatura[response.data.temperatura.length - 1].valor
        : 0;
      const novoAlertaTemp = ultTemp > LIMITE_TEMPERATURA;
      if (novoAlertaTemp !== ultimoAlertaTempRef.current) {
        if (novoAlertaTemp) falar("Cuidado! Temperatura da motobomba muito alta.");
        ultimoAlertaTempRef.current = novoAlertaTemp;
      }
      setAlertaTemperatura(novoAlertaTemp);

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  }, [alertaVibracao, alertaTemperatura]); // dependências do useCallback

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]); // agora com dependência correta

  return (
    <div style={{ padding: 20 }}>
      <VLibras forceOnload={true} rootPath="https://vlibras.gov.br/app" />
      <h2>Monitoramento Motobomba</h2>

      {!audioAtivado && (
        <button
          onClick={ativarAudio}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "10px 15px",
            marginBottom: "20px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          🔈 Ativar Alerta Sonoro
        </button>
      )}

      {alertaVibracao && (
        <div style={{
          backgroundColor: "#ff4444",
          color: "white",
          padding: "15px",
          marginBottom: "15px",
          borderRadius: "8px",
          fontWeight: "bold",
          textAlign: "center",
          fontSize: "1.2em",
          border: "2px solid darkred",
          animation: "blink 1s step-start infinite"
        }}>
          ⚠️ ALERTA: Vibração ACIMA do limite permitido! ⚠️
        </div>
      )}

      {alertaTemperatura && (
        <div style={{
          backgroundColor: "#ff8800",
          color: "black",
          padding: "15px",
          marginBottom: "15px",
          borderRadius: "8px",
          fontWeight: "bold",
          textAlign: "center",
          fontSize: "1.2em",
          border: "2px solid darkorange"
        }}>
          🔥 CUIDADO: Temperatura da bomba muito alta! 🔥
        </div>
      )}

      <div style={{ height: 300, marginBottom: 40 }}>
        {temperatura.length > 0 ? (
          <Chart
            dados={temperatura}
            titulo="Temperatura"
            cor={alertaTemperatura ? "orange" : "red"}
            unidade="°C"
          />
        ) : (
          <p>Aguardando dados de temperatura...</p>
        )}
      </div>

      <div style={{ height: 300 }}>
        {vibracao.length > 0 ? (
          <Chart
            dados={vibracao}
            titulo="Vibração"
            cor={alertaVibracao ? "darkred" : "blue"}
            unidade="m/s²"
          />
        ) : (
          <p>Aguardando dados de vibração...</p>
        )}
      </div>
    </div>
  );
}

export default App;