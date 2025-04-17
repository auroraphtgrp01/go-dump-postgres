import { useState, useEffect } from 'react';
import { Card, Steps, Button, Typography, Alert, Spin } from 'antd';
import { GoogleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Step } = Steps;
const { Title, Paragraph } = Typography;

interface GoogleAuthFormProps {
  onAuthComplete?: () => void;
}

const GoogleAuthForm: React.FC<GoogleAuthFormProps> = ({ onAuthComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const [checkingInterval, setCheckingInterval] = useState<number | null>(null);

  // Xóa interval khi component unmount
  useEffect(() => {
    return () => {
      if (checkingInterval) {
        clearInterval(checkingInterval);
      }
    };
  }, [checkingInterval]);

  // Kiểm tra trạng thái xác thực
  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/drive/status');
      const isAuthenticated = response.data.drive_status?.is_authenticated || false;
      
      if (isAuthenticated) {
        setSuccess(true);
        setCurrentStep(2);
        
        // Đóng cửa sổ popup nếu còn mở
        if (authWindow && !authWindow.closed) {
          authWindow.close();
        }
        
        // Xóa interval kiểm tra
        if (checkingInterval) {
          clearInterval(checkingInterval);
          setCheckingInterval(null);
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Lỗi khi kiểm tra trạng thái xác thực:', err);
      return false;
    }
  };

  // Lấy URL xác thực từ API và mở cửa sổ xác thực
  const startAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get('/api/auth/url');
      const authUrl = response.data.auth_url;
      
      // Mở URL trong cửa sổ popup
      const newAuthWindow = window.open(authUrl, 'Google Auth', 'width=600,height=700');
      setAuthWindow(newAuthWindow);
      
      if (newAuthWindow) {
        // Chuyển sang bước tiếp theo
        setCurrentStep(1);
        
        // Thiết lập interval để kiểm tra trạng thái xác thực
        const interval = window.setInterval(async () => {
          // Kiểm tra xem cửa sổ đã đóng chưa
          if (newAuthWindow.closed) {
            // Kiểm tra xem đã xác thực thành công chưa
            const authenticated = await checkAuthStatus();
            
            if (!authenticated) {
              setError('Quá trình xác thực bị hủy hoặc không hoàn thành.');
              setCurrentStep(0);
            }
            
            // Xóa interval khi cửa sổ đã đóng
            clearInterval(interval);
            setCheckingInterval(null);
          }
        }, 1000);
        
        setCheckingInterval(interval);
      } else {
        setError('Không thể mở cửa sổ xác thực. Vui lòng kiểm tra trình duyệt của bạn.');
      }
    } catch (err) {
      setError('Không thể lấy URL xác thực. Vui lòng thử lại sau.');
      console.error('Lỗi khi lấy URL xác thực:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto my-4">
      <Title level={4} className="text-center mb-6">
        <GoogleOutlined className="mr-2" />
        Xác thực Google Drive
      </Title>

      <Steps current={currentStep} className="mb-8">
        <Step title="Bắt đầu" description="Khởi tạo xác thực" />
        <Step title="Xác thực" description="Đang xác thực Google" />
        <Step title="Hoàn tất" description="Kết thúc xác thực" />
      </Steps>

      {error && (
        <Alert type="error" message={error} className="mb-4" closable />
      )}

      {currentStep === 0 && (
        <div className="text-center">
          <Paragraph>
            Để sử dụng tính năng lưu trữ backup lên Google Drive, bạn cần xác thực tài khoản Google.
          </Paragraph>
          <Button 
            type="primary" 
            icon={<GoogleOutlined />} 
            onClick={startAuth}
            loading={loading}
            size="large"
            className="mt-4"
          >
            Bắt đầu xác thực với Google
          </Button>
        </div>
      )}

      {currentStep === 1 && (
        <div className="text-center py-8">
          <Spin size="large" />
          <Paragraph className="mt-4">
            Đang xác thực với Google Drive...
          </Paragraph>
          <Paragraph className="text-gray-500">
            Vui lòng hoàn tất quá trình xác thực trong cửa sổ đã mở.
          </Paragraph>
        </div>
      )}

      {currentStep === 2 && (
        <div className="text-center">
          {loading ? (
            <Spin size="large" />
          ) : success ? (
            <>
              <div className="text-center mb-4">
                <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                <Title level={4} className="mt-2">Xác thực thành công!</Title>
                <Paragraph>
                  Tài khoản Google của bạn đã được xác thực thành công. Bạn có thể sử dụng tính năng sao lưu lên Google Drive.
                </Paragraph>
              </div>
              <Button 
                type="primary"
                onClick={onAuthComplete}
              >
                Tiếp tục
              </Button>
            </>
          ) : (
            <div>
              <Alert
                type="error"
                message="Xác thực không thành công"
                description="Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại."
                className="mb-4"
              />
              <Button onClick={() => setCurrentStep(0)}>
                Thử lại
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default GoogleAuthForm; 