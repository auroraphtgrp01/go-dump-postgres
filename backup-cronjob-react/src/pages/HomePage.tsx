import { useState, useEffect } from 'react';
import { Card } from 'antd';
import Header from '../components/Header';
import BackupActions from '../components/BackupActions';
import BackupList from '../components/BackupList';
import AuthBanner from '../components/AuthBanner';
import OperationAlert from '../components/OperationAlert';
import { IOperationResult } from '../types';
import { syncAuthState } from '../utils/auth';

const HomePage = () => {
  const [needAuth, setNeedAuth] = useState(true);
  const [lastOperation, setLastOperation] = useState<IOperationResult | null>(null);
  
  // Check auth state on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await syncAuthState();
      setNeedAuth(!isAuthenticated);
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
  }, []);
  
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
          <h1 className="text-2xl font-bold mb-4">Công cụ Backup và Upload Database</h1>
          
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