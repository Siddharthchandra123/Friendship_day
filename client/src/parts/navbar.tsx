import "./Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="logo">
        ❤️ Baithak
      </div>

      <ul className="nav-links">
        <li>Home</li>
        <li>Memories</li>
        <li>Gallery</li>
        <li>Letter</li>
        <li>Surprise</li>
      </ul>

      <div className="profile">
        Happy Friendship Day
      </div>
    </nav>
  );
};

export default Navbar;