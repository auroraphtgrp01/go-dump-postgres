import { Alert, Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface AuthBannerProps {
  needAuth: boolean;
}

const AuthBanner: React.FC<AuthBannerProps> = ({ needAuth }) => {
  const navigate = useNavigate();
  
  // Nếu không cần xác thực, không hiển thị banner
  if (!needAuth) return null;

  const handleAuthClick = () => {
    // Điều hướng đến trang xác thực Google Drive
    navigate('/google-auth');
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
            onClick={handleAuthClick}
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