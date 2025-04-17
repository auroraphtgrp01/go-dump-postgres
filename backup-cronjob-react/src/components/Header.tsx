import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dropdown, Menu, Button, Avatar, Badge, Tooltip } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined, 
  FileTextOutlined, 
  DatabaseOutlined,
  GithubOutlined,
  AppstoreOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { isAuthenticated, logout, getUser } from '../utils/auth';

interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(getUser());
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Re-check auth status on component mount
    setLoggedIn(isAuthenticated());
    setUser(getUser());

    // Add scroll event listener
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    // Redirect will happen in logout function
  };

  const userMenu = (
    <Menu className="neo-dropdown-menu">
      <div className="user-info p-3 border-b border-slate-700 mb-2">
        <div className="flex items-center mb-2">
          <Avatar icon={<UserOutlined />} className="mr-2 bg-indigo-600" />
          <span className="text-gray-300 font-medium">{user?.username || 'User'}</span>
        </div>
        <div className="text-xs text-gray-500">Đăng nhập lần cuối: {new Date().toLocaleString('vi-VN')}</div>
      </div>
      <Menu.Item key="settings" icon={<SettingOutlined className="text-purple-400" />}>
        <Link to="/settings">Cấu hình hệ thống</Link>
      </Menu.Item>
      <Menu.Item key="logs" icon={<FileTextOutlined className="text-cyan-400" />}>
        <Link to="/logs">Nhật ký hệ thống</Link>
      </Menu.Item>
      <Menu.Divider className="bg-slate-700 my-2" />
      <Menu.Item key="logout" icon={<LogoutOutlined className="text-red-400" />} onClick={handleLogout}>
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  // Navigation items
  const navItems = [
    { key: '/', label: 'Dashboard', icon: <HomeOutlined /> },
    { key: '/settings', label: 'Cấu hình', icon: <SettingOutlined /> },
  ];

  return (
    <div className={`neo-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container mx-auto flex justify-between items-center py-3 px-4">
        <div className="flex items-center">
          <div className="brand-logo mr-6">
            <DatabaseOutlined className="text-2xl text-gradient-cyan-purple" />
            <span className="brand-text ml-2 font-bold text-white text-xl tracking-tight">pgBackup</span>
          </div>
          
          <div className="hidden md:flex space-x-1">
            {navItems.map(item => (
              <Link 
                key={item.key} 
                to={item.key}
                className={`neo-nav-item ${location.pathname === item.key ? 'active' : ''}`}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Tooltip title="Xem mã nguồn">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 hover:text-cyan-400 transition-colors text-gray-400"
            >
              <GithubOutlined className="text-lg" />
            </a>
          </Tooltip>
          
          <div className="header-divider mx-2"></div>
          
          {loggedIn ? (
            <Dropdown overlay={userMenu} placement="bottomRight" trigger={['click']} overlayClassName="neo-dropdown">
              <Button type="text" className="neo-user-button">
                <Badge dot status="success" offset={[-6, 6]}>
                  <Avatar icon={<UserOutlined />} className="bg-indigo-600 border-2 border-slate-700" />
                </Badge>
                <span className="ml-2 hidden sm:inline">{user?.username || 'User'}</span>
              </Button>
            </Dropdown>
          ) : (
            <Link to="/login">
              <Button type="primary" className="neo-login-button">
                <UserOutlined /> <span className="ml-1">Đăng nhập</span>
              </Button>
            </Link>
          )}
          
          <Dropdown 
            overlay={
              <Menu className="neo-dropdown-menu">
                {navItems.map(item => (
                  <Menu.Item key={item.key} icon={item.icon}>
                    <Link to={item.key}>{item.label}</Link>
                  </Menu.Item>
                ))}
              </Menu>
            } 
            placement="bottomRight"
            className="md:hidden"
          >
            <Button type="text" className="neo-menu-button" icon={<AppstoreOutlined />} />
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default Header; 