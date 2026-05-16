import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

const Chart = React.memo(({ dados, titulo, cor, unidade }) => {
  const chartData = useMemo(() => ({
    labels: dados.map(d => new Date(d.data).toLocaleTimeString()),
    datasets: [{
      label: `${titulo} (${unidade})`,
      data: dados.map(d => d.valor),
      borderColor: cor,
      backgroundColor: `rgba(${cor === 'red' ? '255,0,0' : '0,0,255'}, 0.1)`,
      fill: true,
      tension: 0.2
    }]
  }), [dados, titulo, cor, unidade]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 }   // DESABILITA ANIMAÇÃO 
  };

  return <Line data={chartData} options={options} />;
});

export default Chart;