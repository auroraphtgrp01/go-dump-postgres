import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Layout, Button, Dropdown, type MenuProps } from 'antd';
import { SettingOutlined, HomeOutlined, LogoutOutlined, DatabaseOutlined, UserOutlined } from '@ant-design/icons';
import { isAuthenticated, logout } from '../utils/auth';

const { Header: AntHeader } = Layout;

// Navigation items
const navItems = [
  { key: '/', label: 'Dashboard', icon: <HomeOutlined /> },
  { key: '/profiles', label: 'Quản lý Profile', icon: <DatabaseOutlined /> },
  { key: '/settings', label: 'Cấu hình', icon: <SettingOutlined /> },
];

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);
  
  const handleLogout = () => {
    logout();
    // Không cần navigate vì logout() đã xử lý redirect
  };
  
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];
  
  return (
    <AntHeader className="bg-white shadow-sm px-0">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-6">
            <DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <span className="ml-2 text-xl font-semibold">Go-Backup</span>
          </Link>
          
          {authenticated && (
            <Menu
              mode="horizontal"
              selectedKeys={[location.pathname]}
              items={navItems}
              onClick={({ key }) => navigate(key)}
              style={{ border: 'none' }}
            />
          )}
        </div>
        
        <div>
          {authenticated ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button icon={<UserOutlined />} type="text" size="large">
                Admin
              </Button>
            </Dropdown>
          ) : (
            <Link to="/login">
              <Button type="primary">Đăng nhập</Button>
            </Link>
          )}
        </div>
      </div>
    </AntHeader>
  );
};

export default Header; 