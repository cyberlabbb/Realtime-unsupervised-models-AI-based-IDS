import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TrafficChart = ({ batches }) => {
  const data = {
    labels: batches?.map((b) => b.batch_name) || [],
    datasets: [
      {
        label: "Total Packets",
        data: batches?.map((b) => b.total_packets) || [],
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
      {
        label: "Total Bytes (KB)",
        data: batches?.map((b) => Math.round(b.total_bytes / 1024)) || [],
        borderColor: "rgb(53, 162, 235)",
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Network Traffic Overview",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return <Line options={options} data={data} />;
};

export default TrafficChart;
