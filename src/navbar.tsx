import "./navbar.css";
import { useNavigate } from "react-router";
function Navbar() {
  const navigate = useNavigate(); // Declare navigate here

  function handleHomeClick() {
    // Logic to navigate to home page
    console.log("Navigate to Home");
    navigate("/home"); // Use the navigate function
  }
  return (
    <div className="navbar">
      <div className="navbar-contents">
        <h2 className="navbar-brand">Attendance Tracker</h2>
        <nav className="navbar-menu">
          <button className="navbar-button" onClick={handleHomeClick}>
            Home
          </button>
          <button className="navbar-button">Log Attendance</button>
          <button className="navbar-button">Plan Holidays</button>
          <button className="navbar-button">Admin</button>
        </nav>
      </div>
    </div>
  );
}

export default Navbar;
