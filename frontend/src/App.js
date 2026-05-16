import { useEffect, useState } from "react";
import axios from "axios";
import "chart.js/auto";
import VLibras from "react-vlibras";
import Chart from "./components/Chart";   // única adição necessária

function App() {
  const [temperatura, setTemperatura] = useState([]);
  const [vibracao, setVibracao] = useState([]);

  const fetchData = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3000";
    console.log("API URL:", apiUrl);
    try{  
      const response = await axios.get(`${apiUrl}/dados`);
      setTemperatura([...response.data.temperatura]);
      setVibracao([...response.data.vibracao]);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      {/* CORREÇÃO DO V-LIBRAS PARA FUNCIONAR ONLINE */}
      <VLibras forceOnload={true} rootPath="https://vlibras.gov.br/app" />
      
      <h2>Monitoramento Motobomba</h2>

      <div style={{ height: 300, marginBottom: 40 }}>
        {temperatura.length > 0 ? (
          <Chart 
            dados={temperatura} 
            titulo="Temperatura" 
            cor="red" 
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
            cor="blue" 
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