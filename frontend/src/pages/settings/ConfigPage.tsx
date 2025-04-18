import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isAuthenticated } from '@/utils/auth';
import Toast from '@/components/Toast';
import { Settings, Database, Save, RefreshCw } from 'lucide-react';
import { ConfigService } from '@/lib/http/api';

const ConfigPage = () => {
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [dbHost, setDbHost] = useState('');
  const [dbPort, setDbPort] = useState('');
  const [backupFrequency, setBackupFrequency] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingConfig, setIsFetchingConfig] = useState(true);
  const navigate = useNavigate();

  // Kiểm tra trạng thái xác thực khi tải trang
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth/login');
      return;
    }

    // Fetch existing configuration
    fetchConfiguration();
  }, [navigate]);

  const fetchConfiguration = async () => {
    setIsFetchingConfig(true);
    try {
      const response = await ConfigService.getConfig();
      
      if (response.data.success && response.data.data) {
        const config = response.data.data;
        // Cập nhật state từ dữ liệu cấu hình
        setDbName(config.db_name || '');
        setDbUser(config.db_user || '');
        setDbPassword(config.db_password || '');
        setDbHost(config.db_host || '');
        setDbPort(config.db_port || '');
        setBackupFrequency(config.backup_frequency || '');
      } else {
        Toast.error(response.data.message || 'Không thể tải cấu hình');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsFetchingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const configData = {
        db_name: dbName,
        db_user: dbUser,
        db_password: dbPassword,
        db_host: dbHost,
        db_port: dbPort,
        backup_frequency: backupFrequency
      };
      
      const response = await ConfigService.saveConfig(configData);

      if (response.data.success) {
        Toast.success('Cấu hình đã được lưu');
      } else {
        Toast.error(response.data.message || 'Không thể lưu cấu hình');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center">
        <Settings className="w-6 h-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">Cấu hình PostgreSQL</h1>
      </div>

      {isFetchingConfig ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Đang tải cấu hình...</p>
        </div>
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-primary" />
              Cấu hình kết nối cơ sở dữ liệu
            </CardTitle>
            <CardDescription>
              Nhập thông tin kết nối PostgreSQL và thiết lập tần suất sao lưu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dbName">Tên database</Label>
                  <Input
                    id="dbName"
                    placeholder="tên_database"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbUser">Tên người dùng</Label>
                  <Input
                    id="dbUser"
                    placeholder="postgres"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbPassword">Mật khẩu</Label>
                  <Input
                    id="dbPassword"
                    type="password"
                    placeholder="********"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbHost">Host</Label>
                  <Input
                    id="dbHost"
                    placeholder="localhost"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbPort">Port</Label>
                  <Input
                    id="dbPort"
                    placeholder="5432"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Tần suất sao lưu (giờ)</Label>
                  <Input
                    id="backupFrequency"
                    type="number"
                    min="1"
                    placeholder="24"
                    value={backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-3 justify-end">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={fetchConfiguration}
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Làm mới
                </Button>
                
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-background border-t-transparent rounded-full"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Lưu cấu hình
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConfigPage; 