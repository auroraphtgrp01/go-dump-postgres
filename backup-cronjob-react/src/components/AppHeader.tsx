import { Layout, Menu, Button, Typography } from 'antd';
import { HomeOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      // Xóa localStorage
      localStorage.removeItem('auth_token');
      // Chuyển hướng đến trang đăng nhập
      navigate('/login');
      toast.success('Đăng xuất thành công');
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  // Xác định key active dựa trên đường dẫn hiện tại
  const getActiveKey = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname === '/settings') return 'settings';
    if (location.pathname === '/google-auth') return 'google-auth';
    return '';
  };

  return (
    <Header className="flex items-center justify-between bg-white">
      <div className="flex items-center">
        <Title level={4} style={{ margin: '0 16px 0 0' }}>
          Backup PostgreSQL
        </Title>
        <Menu 
          mode="horizontal" 
          selectedKeys={[getActiveKey()]}
          style={{ minWidth: 280 }}
          items={[
            {
              key: 'home',
              icon: <HomeOutlined />,
              label: 'Trang chủ',
              onClick: () => navigate('/')
            },
            {
              key: 'settings',
              icon: <SettingOutlined />,
              label: 'Cài đặt',
              onClick: () => navigate('/settings')
            }
          ]}
        />
      </div>
      
      <Button 
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        type="text"
        danger
      >
        Đăng xuất
      </Button>
    </Header>
  );
};

export default AppHeader; 