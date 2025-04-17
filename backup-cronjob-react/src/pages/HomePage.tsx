import { useState, useEffect } from 'react';
import { Layout, Typography, Row, Col, Spin, Statistic, Badge, Avatar, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import { 
  CloudSyncOutlined, 
  DatabaseOutlined, 
  CheckCircleOutlined, 
  RocketOutlined, 
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import Header from '../components/Header';
import BackupActions from '../components/BackupActions';
import BackupList from '../components/BackupList';
import AuthBanner from '../components/AuthBanner';
import OperationAlert from '../components/OperationAlert';
import { IOperationResult } from '../types';
import { syncAuthState, isAuthenticated } from '../utils/auth';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const HomePage = () => {
  const [needAuth, setNeedAuth] = useState(true);
  const [lastOperation, setLastOperation] = useState<IOperationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check auth state on component mount
  useEffect(() => {
    const checkAuth = async () => {
      // Kiểm tra xác thực và chuyển hướng nếu chưa đăng nhập
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }
      
      setIsLoading(true);
      const isAuth = await syncAuthState();
      setNeedAuth(!isAuth);
      setIsLoading(false);
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
    <Layout className="min-h-screen">
      <Header />
      
      <Content className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* App Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="glass-effect inline-block py-3 px-6 rounded-full mb-4">
              <Badge 
                count={<span className="neo-badge">PostgreSQL</span>}
                offset={[10, 0]}
              >
                <Avatar 
                  size={48}
                  icon={<DatabaseOutlined />}
                  className="bg-gradient-to-r from-violet-500 to-sky-500"
                />
              </Badge>
            </div>
            <Title level={2} className="text-gradient-purple font-bold !mb-3">
              PostgreSQL Backup Manager
            </Title>
            <Paragraph className="text-slate-300 text-lg max-w-xl mx-auto">
              Hệ thống quản lý sao lưu và đồng bộ dữ liệu với Google Drive
            </Paragraph>
            <div className="neo-divider mx-auto mt-4 pulse-slow"></div>
          </div>
          
          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center glass-effect py-16 px-4 rounded-2xl animate-fade-in">
              <Spin size="large" />
              <Text className="text-sky-400 mt-4 text-lg">
                Đang kiểm tra trạng thái xác thực...
              </Text>
            </div>
          ) : (
            <>
              {/* Alerts */}
              <div className="mb-6 animate-fade-in">
                <AuthBanner needAuth={needAuth} />
                <OperationAlert operation={lastOperation} />
              </div>
              
              {/* System Status */}
              <div className="mb-10">
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={8}>
                    <div className={`neo-card gradient-border animate-fade-in`} 
                      style={{ animationDelay: '0.1s' }}>
                      <div className="neo-card-header">
                        <div className="flex justify-between items-center">
                          <Text strong className="text-slate-300">Trạng thái kết nối</Text>
                          <Tooltip title={needAuth ? 'Cần xác thực Google' : 'Đã xác thực'}>
                            {needAuth ? (
                              <RocketOutlined className="text-amber-400 text-xl" />
                            ) : (
                              <CheckCircleOutlined className="text-emerald-400 text-xl" />
                            )}
                          </Tooltip>
                        </div>
                      </div>
                      <div className="neo-card-body">
                        <Statistic 
                          title={<span className="text-slate-300">Google Drive</span>}
                          value={needAuth ? "Chưa xác thực" : "Đã kết nối"}
                          valueStyle={{ 
                            color: needAuth ? 'var(--warning)' : 'var(--success)',
                            fontSize: '1.25rem'
                          }}
                        />
                        <div className="mt-3 flex items-center">
                          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={needAuth 
                                ? "h-full bg-amber-500 rounded-full w-1/4" 
                                : "h-full bg-emerald-500 rounded-full w-full"}
                              style={{
                                transition: "width 1s ease-in-out"
                              }}
                            />
                          </div>
                          <span className="ml-2 text-xs text-slate-300">
                            {needAuth ? '25%' : '100%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} lg={8}>
                    <div className="neo-card gradient-border animate-fade-in"
                      style={{ animationDelay: '0.2s' }}>
                      <div className="neo-card-header">
                        <div className="flex justify-between items-center">
                          <Text strong className="text-slate-300">Hệ thống database</Text>
                          <Tooltip title="PostgreSQL">
                            <DatabaseOutlined className="text-violet-400 text-xl" />
                          </Tooltip>
                        </div>
                      </div>
                      <div className="neo-card-body">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <Statistic 
                              title={<span className="text-slate-300">Loại</span>}
                              value="PostgreSQL"
                              valueStyle={{ 
                                color: 'var(--primary)',
                                fontSize: '1.25rem'
                              }}
                            />
                          </div>
                          <div className="flex gap-1 items-center justify-center -mt-2">
                            <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse"></span>
                            <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" 
                              style={{ animationDelay: "0.3s" }}></span>
                            <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse"
                              style={{ animationDelay: "0.6s" }}></span>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center text-xs text-slate-300">
                          <span>Backup Engine</span>
                          <span>v1.0.0</span>
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  <Col xs={24} lg={8}>
                    <div className="neo-card gradient-border animate-fade-in"
                      style={{ animationDelay: '0.3s' }}>
                      <div className="neo-card-header">
                        <div className="flex justify-between items-center">
                          <Text strong className="text-slate-300">Lưu trữ</Text>
                          <Tooltip title="Google Drive Storage">
                            <SafetyCertificateOutlined className="text-sky-400 text-xl" />
                          </Tooltip>
                        </div>
                      </div>
                      <div className="neo-card-body">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <Statistic 
                              title={<span className="text-slate-300">Nơi lưu trữ</span>}
                              value="Google Drive"
                              valueStyle={{ 
                                color: 'var(--secondary)',
                                fontSize: '1.25rem'
                              }}
                            />
                          </div>
                          <BarChartOutlined className="text-sky-400 text-xl" />
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Sử dụng</span>
                            <span className="text-sky-300">75%</span>
                          </div>
                          <div className="mt-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
              
              {/* Actions Card */}
              <div className="mb-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="neo-card">
                  <div className="neo-card-header">
                    <div className="flex items-center">
                      <ThunderboltOutlined className="text-amber-400 mr-2 text-xl" />
                      <Title level={4} className="!m-0 text-gradient-blue">Thao tác nhanh</Title>
                    </div>
                  </div>
                  <div className="neo-card-body">
                    <BackupActions 
                      needAuth={needAuth} 
                      onOperationComplete={handleOperationComplete} 
                    />
                  </div>
                </div>
              </div>
              
              {/* Backup Files List */}
              <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="neo-card">
                  <div className="neo-card-header">
                    <div className="flex items-center">
                      <CloudSyncOutlined className="text-cyan-400 mr-2 text-xl" />
                      <Title level={4} className="!m-0 text-gradient-cyan">Danh sách file backup</Title>
                    </div>
                  </div>
                  <div className="p-0">
                    <BackupList needAuth={needAuth} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Content>
      
      {/* Footer */}
      <div className="py-6 px-4 glass-effect text-center">
        <div className="neo-divider mx-auto mb-4 opacity-30"></div>
        <Text className="text-slate-500">
          © {new Date().getFullYear()} PostgreSQL Backup Manager
        </Text>
        <div className="flex justify-center gap-4 mt-3">
          <a href="#" className="text-sky-500 hover:text-sky-400 text-sm">Hướng dẫn</a>
          <span className="text-slate-700">|</span>
          <a href="#" className="text-sky-500 hover:text-sky-400 text-sm">Giới thiệu</a>
          <span className="text-slate-700">|</span>
          <a href="#" className="text-sky-500 hover:text-sky-400 text-sm">Hỗ trợ</a>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;