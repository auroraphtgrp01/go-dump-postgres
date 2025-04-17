import { Alert, Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';

interface AuthBannerProps {
  needAuth: boolean;
}

const AuthBanner: React.FC<AuthBannerProps> = ({ needAuth }) => {
  // Nếu không cần xác thực, không hiển thị banner
  if (!needAuth) return null;

  const openAuthWindow = () => {
    // Tránh mở nhiều cửa sổ xác thực
    const authWindow = window.open('/auth/google/login', 'Auth Window', 'width=500,height=600');
    
    if (authWindow) {
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          
          // Tải lại trang chỉ nếu có token mới
          if (localStorage.getItem('auth_token')) {
            window.location.reload();
          }
        }
      }, 500);
    }
  };

  return (
    <Alert
      message="Cần xác thực!"
      description={
        <div>
          <p>Để sử dụng tính năng upload lên Google Drive, bạn cần xác thực tài khoản Google.</p>
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            onClick={openAuthWindow}
            className="mt-2"
          >
            Xác thực với Google
          </Button>
        </div>
      }
      type="warning"
      showIcon
      className="mb-4"
    />
  );
};

export default AuthBanner; 