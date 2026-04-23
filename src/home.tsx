import "./home.css";
import Navbar from "./navbar";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

function home() {
  ChartJS.register(ArcElement, Tooltip, Legend);
  const data = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        label: "Days",
        data: [20, 2],
        backgroundColor: ["rgba(75, 192, 192, 0.2)", "rgba(255, 99, 132, 0.2)"],
        borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
        borderWidth: 1,
      },
    ],
  };
  return (
    <div className="home">
      <div className="navbar-container">
        <Navbar />
      </div>
      <h1>Your personal overview</h1>
      <p className="stats">
        Total working days: 22
        <br />
        Days attended: 20
        <br />
      </p>
      <div className="piechart">
        <Pie data={data}></Pie>
      </div>
    </div>
  );
}

export default home;
