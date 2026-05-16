import { useEffect, useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import "chart.js/auto";
import VLibras from "react-vlibras";

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
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const chartTemperatura = useMemo(() => ({
    labels: temperatura.map(d => new Date(d.data).toLocaleTimeString()),
    datasets: [{
        label: "Temperatura (°C)",
        data: temperatura.map(d => d.valor),
        borderColor: "red",
        backgroundColor: "rgba(255,0,0,0.1)",
        fill: true,
       	tension: 0.2    //suaviza a linha
    }]
  }), [temperatura]);

  const chartVibracao = useMemo(() => ({
    labels: vibracao.map(d => new Date(d.data).toLocaleTimeString()),
    datasets: [{
        label: "Vibração",
        data: vibracao.map(d => d.valor),
        borderColor: "blue",
	backgroundColor: "rgba(0,0,255,0.1)",
        fill: true,
	tension: 0.2
    }]
  }), [vibracao]);

  return (
    <div style={{ padding: 20 }}>
      <VLibras /> {/* componente de acessibilidade */}
      <h2>Monitoramento Motobomba</h2>

      <div style={{ height: 300, marginBottom: 40 }}>
        {temperatura.length > 0 ? (
          <Line data={chartTemperatura} options={{ responsive: true, maintainAspectRatio:false}} />
	) : (
	  <p>Aguardando dados de temperatura...</p>
	)}
      </div>
      <div style={{ height: 300 }}>
	{vibracao.length > 0 ? (
          <Line data={chartVibracao} options={{ responsive: true, maintainAspectRatio: false }} />
	) : (
	  <p>Aguardadndo dados de vibração...</p>
	)}
      </div>
    </div>
  );
}

export default App;