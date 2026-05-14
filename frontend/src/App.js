import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import axios from "axios";
import "chart.js/auto";

function App() {
  const [temperatura, setTemperatura] = useState([]);
  const [vibracao, setVibracao] = useState([]);

  const fetchData = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3000";
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

  const chartTemperatura = {
    labels: temperatura.map(d =>
      new Date(d.data).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Temperatura (°C)",
        data: temperatura.map(d => d.valor),
        borderColor: "red",
        fill: false,
      },
    ],
  };

  const chartVibracao = {
    labels: vibracao.map(d =>
      new Date(d.data).toLocaleTimeString()
    ),
    datasets: [
      {
        label: "Vibração",
        data: vibracao.map(d => d.valor),
        borderColor: "blue",
        fill: false,
      },
    ],
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Monitoramento Motobomba</h2>

      <div style={{ height: 300 }}>
        <Line data={chartTemperatura} />
      </div>

      <div style={{ height: 300, marginTop: 40 }}>
        <Line data={chartVibracao} />
      </div>
    </div>
  );
}

export default App;