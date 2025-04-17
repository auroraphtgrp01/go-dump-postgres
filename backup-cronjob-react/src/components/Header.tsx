import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, Menu, Button, Avatar } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, FileTextOutlined } from '@ant-design/icons';
import { isAuthenticated, logout, getUser } from '../utils/auth';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = 'Công cụ Backup và Upload Database' }) => {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    // Re-check auth status on component mount
    setLoggedIn(isAuthenticated());
    setUser(getUser());
  }, []);

  const handleLogout = async () => {
    await logout();
    // Redirect will happen in logout function
  };

  const menu = (
    <Menu>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        <Link to="/settings">Cấu hình hệ thống</Link>
      </Menu.Item>
      <Menu.Item key="logs" icon={<FileTextOutlined />}>
        <Link to="/logs">Nhật ký hệ thống</Link>
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="flex justify-between items-center bg-blue-600 text-white p-4">
      <h1 className="text-xl font-bold">{title}</h1>
      <div>
        {loggedIn ? (
          <Dropdown overlay={menu} placement="bottomRight">
            <Button type="text" className="text-white flex items-center">
              <Avatar size="small" icon={<UserOutlined />} className="mr-2" />
              <span>{user?.username || 'User'}</span>
            </Button>
          </Dropdown>
        ) : (
          <Link to="/login">
            <Button type="primary" ghost>
              <UserOutlined /> Đăng nhập
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Header; 