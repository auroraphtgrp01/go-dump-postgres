import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Card, Spin } from 'antd';
import axios from 'axios';
import GoogleAuthForm from '../components/GoogleAuthForm';
import AppLayout from '../components/AppLayout';

const { Title, Paragraph } = Typography;

const GoogleAuthPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [needAuth, setNeedAuth] = useState(false);
  
  useEffect(() => {
    const checkDriveStatus = async () => {
      try {
        const response = await axios.get('/api/drive/status');
        console.log('Kết quả kiểm tra Drive status:', response.data);
        
        // Kiểm tra trạng thái xác thực từ phản hồi API
        const isAuthenticated = response.data.drive_status?.is_authenticated || false;
        
        // Nếu đã xác thực thì chuyển hướng về trang chính
        if (isAuthenticated) {
          navigate('/');
          return;
        }
        
        setNeedAuth(true);
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái Google Drive:', error);
        setNeedAuth(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkDriveStatus();
  }, [navigate]);
  
  const handleAuthComplete = () => {
    // Chuyển hướng về trang chính sau khi xác thực thành công
    navigate('/');
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        <Card>
          <Title level={2} className="text-center mb-6">
            Xác thực Google Drive
          </Title>
          
          <Paragraph className="text-center mb-6">
            Để sử dụng tính năng sao lưu lên Google Drive, bạn cần xác thực tài khoản Google.
          </Paragraph>
          
          {loading ? (
            <div className="text-center py-8">
              <Spin size="large" />
              <Paragraph className="mt-4">Đang kiểm tra trạng thái xác thực...</Paragraph>
            </div>
          ) : needAuth ? (
            <GoogleAuthForm onAuthComplete={handleAuthComplete} />
          ) : (
            <div className="text-center py-8">
              <Paragraph>Đang chuyển hướng...</Paragraph>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default GoogleAuthPage; 