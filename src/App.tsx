import "./App.css";
import Navbar from "./navbar";

function App() {
  return (
    <div className="App">
      <div className="navbar-container">
        <Navbar />
      </div>
      <div className="content">
        <h1>Welcome to Attendance Tracker</h1>
        <p>
          Manage your attendance, plan holidays, and access administrative
          features all in one place.
        </p>
        <div className="features">
          <div className="feature-card">
            <h3>Log Attendance</h3>
            <p>Record your daily attendance with ease</p>
          </div>
          <div className="feature-card">
            <h3>Plan Holidays</h3>
            <p>Schedule and manage your leave requests</p>
          </div>
          <div className="feature-card">
            <h3>Admin Panel</h3>
            <p>Access administrative tools and reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
