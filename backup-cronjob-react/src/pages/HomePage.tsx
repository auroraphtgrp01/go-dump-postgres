import { useState, useEffect } from 'react';
import { Card, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BackupActions from '../components/BackupActions';
import BackupList from '../components/BackupList';
import AuthBanner from '../components/AuthBanner';
import OperationAlert from '../components/OperationAlert';
import { IOperationResult } from '../types';
import { syncAuthState, isAuthenticated } from '../utils/auth';

const HomePage = () => {
  const [needAuth, setNeedAuth] = useState(true);
  const [lastOperation, setLastOperation] = useState<IOperationResult | null>(null);
  const navigate = useNavigate();
  
  // Check auth state on component mount
  useEffect(() => {
    const checkAuth = async () => {
      // Kiểm tra xác thực và chuyển hướng nếu chưa đăng nhập
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }
      
      const isAuth = await syncAuthState();
      setNeedAuth(!isAuth);
    };
    
    checkAuth();
    
    // Check for operation result in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const message = urlParams.get('message');
    
    if (success !== null && message) {
      setLastOperation({
        success: success === 'true',
        message: decodeURIComponent(message)
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);
  
  // Callback after operation completes
  const handleOperationComplete = () => {
    // Refresh data
    window.location.reload();
  };
  
  return (
    <div>
      <Header />
      
      <div className="container mx-auto my-4 px-4">
        <Card className="shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Công cụ Backup và Upload Database</h1>
          </div>
          
          <Divider />
          
          {/* Auth Banner */}
          <AuthBanner needAuth={needAuth} />
          
          {/* Operation Alert */}
          <OperationAlert operation={lastOperation} />
          
          {/* Backup Actions */}
          <BackupActions 
            needAuth={needAuth} 
            onOperationComplete={handleOperationComplete} 
          />
          
          {/* Backup List */}
          <BackupList needAuth={needAuth} />
        </Card>
      </div>
    </div>
  );
};

export default HomePage; 