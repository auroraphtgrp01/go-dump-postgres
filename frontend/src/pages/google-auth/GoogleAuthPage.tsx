import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAuthenticated } from '@/utils/auth';
import Toast from '@/components/Toast';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import axios from 'axios';

const GoogleAuthPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [authPopup, setAuthPopup] = useState<Window | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  // Hàm dọn dẹp interval
  const clearCheckInterval = () => {
    if (checkIntervalRef.current !== null) {
      window.clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  };

  // Thêm hàm kiểm tra trạng thái xác thực
  const verifyAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get('/api/drive/status', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      
      console.log('Kiểm tra trạng thái xác thực Google Drive:', response.data);
      
      // Kiểm tra trạng thái xác thực từ phản hồi API
      const isAuthenticated = response.data.drive_status?.is_authenticated || false;
      
      if (isAuthenticated) {
        // Đánh dấu xác thực thành công
        setAuthSuccess(true);
        setMessage('Xác thực Google Drive thành công!');
        Toast.success('Xác thực Google Drive thành công');
        
        // Chuyển về trang chủ sau 3 giây
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        // Xác thực thất bại
        setAuthSuccess(false);
        setMessage('Không thể xác nhận trạng thái xác thực Google Drive.');
        Toast.error('Không thể xác nhận trạng thái xác thực');
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái xác thực:', error);
      setAuthSuccess(false);
      setMessage('Lỗi kết nối máy chủ khi kiểm tra trạng thái');
      Toast.error('Lỗi kết nối máy chủ');
    }
  };

  useEffect(() => {
    // Kiểm tra xác thực
    if (!isAuthenticated()) {
      navigate('/auth/login');
      return;
    }

    // Kiểm tra xem có code từ Google không
    const code = searchParams.get('code');
    if (code) {
      handleAuthCode(code);
    }
    
    // Thêm event listener để lắng nghe message từ popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        console.log('Nhận thông báo xác thực Google thành công:', event.data);
        
        // Dọn dẹp interval kiểm tra
        clearCheckInterval();
        
        // Kiểm tra trạng thái xác thực thực tế từ API
        verifyAuthStatus();
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup event listener khi component unmount
    return () => {
      window.removeEventListener('message', handleMessage);
      clearCheckInterval();
    };
  }, [navigate, searchParams]);
  
  // Thiết lập interval kiểm tra khi popup đang mở
  useEffect(() => {
    // Nếu có cửa sổ popup và không có interval kiểm tra
    if (authPopup && checkIntervalRef.current === null) {
      // Thiết lập interval để kiểm tra trạng thái xác thực định kỳ
      const intervalId = window.setInterval(() => {
        // Kiểm tra xem cửa sổ đã đóng chưa
        if (authPopup.closed) {
          console.log('Cửa sổ xác thực đã đóng, kiểm tra trạng thái xác thực');
          clearCheckInterval();
          verifyAuthStatus();
        }
      }, 1000);
      
      checkIntervalRef.current = intervalId;
    }
    
    // Cleanup interval khi component unmount hoặc khi authPopup thay đổi
    return () => {
      clearCheckInterval();
    };
  }, [authPopup]);

  const handleAuthCode = async (code: string) => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      
      setAuthSuccess(data.success);
      setMessage(data.message || 'Xác thực hoàn tất');

      if (data.success) {
        Toast.success('Xác thực Google Drive thành công');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        Toast.error(data.message || 'Xác thực thất bại');
      }
    } catch (error) {
      console.error('Error processing auth code:', error);
      setAuthSuccess(false);
      setMessage('Lỗi kết nối máy chủ');
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGetAuthUrl = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auth/url', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      const data = await response.json();
      
      if (data.success && data.auth_url) {
        // Thay vì chuyển trang, mở popup
        const popup = window.open(
          data.auth_url,
          'Google Auth',
          'width=600,height=700,menubar=no,toolbar=no,location=no'
        );
        
        setAuthPopup(popup);
        
        if (!popup) {
          // Nếu popup bị chặn, chuyển hướng thay thế
          Toast.error('Popup bị chặn. Vui lòng cho phép popup và thử lại');
          setMessage('Popup bị chặn. Vui lòng cho phép popup và thử lại');
          setAuthSuccess(false);
          setIsProcessing(false);
        }
      } else {
        setAuthSuccess(false);
        setMessage(data.message || 'Không thể lấy URL xác thực');
        Toast.error(data.message || 'Không thể lấy URL xác thực');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setAuthSuccess(false);
      setMessage('Lỗi kết nối máy chủ');
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 p-4">
      <div className="w-full max-w-lg">
        <Card className="border-none shadow-xl backdrop-blur-sm bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Xác thực Google Drive</CardTitle>
            <CardDescription>
              Kết nối tài khoản của bạn với Google Drive để lưu trữ bản sao lưu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium">Đang xử lý...</p>
                <p className="text-muted-foreground text-center mt-2">
                  Đang kết nối với Google Drive, vui lòng chờ trong giây lát
                </p>
              </div>
            ) : authSuccess === null ? (
              <div className="flex flex-col items-center py-4">
                <div className="mb-6 relative w-24 h-24">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute inset-2 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 11V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 11H19V21H5V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                
                <p className="text-center mb-8 text-muted-foreground">
                  Để sử dụng tính năng sao lưu lên Google Drive, bạn cần xác thực và cấp quyền truy cập cho ứng dụng.
                </p>
                
                <Button 
                  onClick={handleGetAuthUrl} 
                  className="w-full max-w-xs"
                  size="lg"
                >
                  Kết nối với Google Drive
                </Button>
              </div>
            ) : authSuccess ? (
              // Trạng thái thành công
              <div className="flex flex-col items-center py-6">
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full p-3 mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-medium text-green-800 dark:text-green-300 mb-2">
                  Xác thực thành công!
                </h3>
                <p className="text-center text-muted-foreground mb-6">
                  {message}
                </p>
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Bạn sẽ được chuyển hướng về trang chủ sau 3 giây...
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại trang chủ
                </Button>
              </div>
            ) : (
              // Trạng thái thất bại
              <div className="flex flex-col items-center py-6">
                <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full p-3 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-red-800 dark:text-red-300 mb-2">
                  Xác thực thất bại
                </h3>
                <p className="text-center text-muted-foreground mb-6">
                  {message}
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => navigate('/')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại
                  </Button>
                  <Button onClick={handleGetAuthUrl}>
                    Thử lại
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleAuthPage; 