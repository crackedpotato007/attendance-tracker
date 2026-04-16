import "./navbar.css";

function Navbar() {
  return (
    <div className="navbar">
      <div className="navbar-contents">
        <h2 className="navbar-brand">Attendance Tracker</h2>
        <nav className="navbar-menu">
          <button className="navbar-button">Home</button>
          <button className="navbar-button">Log Attendance</button>
          <button className="navbar-button">Plan Holidays</button>
          <button className="navbar-button">Admin</button>
        </nav>
      </div>
    </div>
  );
}

export default Navbar;
