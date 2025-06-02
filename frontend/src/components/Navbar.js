import { Link } from 'react-router-dom';

const Navbar = () => {
  const isAuthenticated = localStorage.getItem('user');

  return (
    <nav>
      <ul>
        <li><Link to="/">Trang chủ</Link></li>
        {!isAuthenticated && (
          <>
            <li><Link to="/login">Đăng nhập</Link></li>
            <li><Link to="/register">Đăng ký</Link></li>
          </>
        )}
        {isAuthenticated && (
          <li><Link to="/dashboard">Dashboard</Link></li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;