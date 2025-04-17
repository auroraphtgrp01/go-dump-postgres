import { useEffect } from 'react';
import { Card, Form, Input, Button } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import Toast from '../components/Toast';

const LoginPage = () => {
  const navigate = useNavigate();
  
  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);
  
  const handleLogin = async (values: { username: string; password: string }) => {
    // Hiển thị thông báo loading
    const loadingMessage = Toast.loading('Đang đăng nhập...');
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      // Đóng thông báo loading
      loadingMessage();
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Save auth token
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Hiển thị thông báo thành công rõ ràng
          Toast.success('Đăng nhập thành công!');
          
          // Đợi 1 giây cho người dùng thấy thông báo trước khi chuyển trang
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          Toast.error(data.message || 'Đăng nhập thất bại');
        }
      } else {
        Toast.error('Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Đóng thông báo loading nếu có lỗi (phòng trường hợp chưa đóng)
      loadingMessage();
      Toast.error('Lỗi kết nối máy chủ');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card 
        title="Đăng nhập" 
        className="shadow-lg max-w-md w-full"
        headStyle={{ fontSize: '1.5rem', textAlign: 'center' }}
      >
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Tên đăng nhập" 
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
            />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage; 