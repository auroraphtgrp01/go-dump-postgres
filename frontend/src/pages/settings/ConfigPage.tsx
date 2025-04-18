import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { isAuthenticated } from '@/utils/auth';
import Toast from '@/components/Toast';
import { Settings, Database, Save, RefreshCw } from 'lucide-react';

// Định nghĩa interface cho dữ liệu cấu hình từ API
interface ConfigItem {
  id: number;
  key: string;
  value: string;
  group: string;
  label: string;
  type: string;
}

interface ConfigGroup {
  group: string;
  label: string;
  configs: ConfigItem[];
}

const ConfigPage = () => {
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
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
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/configs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Config data:', data);
          setConfigGroups(data.data);
          
          // Chuẩn bị dữ liệu cho form
          const values: Record<string, string> = {};
          data.data.forEach((group: ConfigGroup) => {
            group.configs.forEach((config: ConfigItem) => {
              values[config.key] = config.value;
            });
          });
          
          setFormValues(values);
        } else {
          Toast.error(data.message || 'Không thể tải cấu hình');
        }
      } else {
        Toast.error('Không thể tải cấu hình');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsFetchingConfig(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Tạo bản sao của formValues để xử lý
      const dataToSubmit = { ...formValues };
      
      // Loại bỏ JWT_SECRET hoàn toàn
      delete dataToSubmit.JWT_SECRET;
      
      // Loại bỏ các giá trị mật khẩu không thay đổi (vẫn là •••••••)
      configGroups.forEach(group => {
        group.configs.forEach(config => {
          if (config.type === 'password' && dataToSubmit[config.key] === '••••••••') {
            // Không gửi các giá trị mật khẩu đã bị ẩn
            delete dataToSubmit[config.key];
          }
        });
      });
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/configs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      const data = await response.json();
      if (data.success) {
        Toast.success('Cấu hình đã được lưu');
      } else {
        Toast.error(data.message || 'Không thể lưu cấu hình');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Hàm cập nhật giá trị form
  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Hàm cập nhật giá trị boolean (switch)
  const handleSwitchChange = (key: string, checked: boolean) => {
    setFormValues(prev => ({
      ...prev,
      [key]: checked ? 'true' : 'false'
    }));
  };

  // Render form item dựa vào loại cấu hình
  const renderFormItem = (config: ConfigItem) => {
    // Không cho sửa JWT_SECRET
    if (config.key === 'JWT_SECRET') {
      return (
        <Input 
          type="password"
          value={formValues[config.key] || ''}
          disabled
        />
      );
    }
    
    switch (config.type) {
      case 'password':
        return (
          <Input
            type="password"
            value={formValues[config.key] || ''}
            onChange={(e) => handleInputChange(config.key, e.target.value)}
            required
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            min={1}
            value={formValues[config.key] || ''}
            onChange={(e) => handleInputChange(config.key, e.target.value)}
            required
          />
        );
      case 'switch':
        return (
          <Switch
            checked={formValues[config.key] === 'true'}
            onCheckedChange={(checked: any) => handleSwitchChange(config.key, checked)}
          />
        );
      default:
        return (
          <Input
            value={formValues[config.key] || ''}
            onChange={(e) => handleInputChange(config.key, e.target.value)}
            required
          />
        );
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center">
        <Settings className="w-6 h-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">Cấu hình hệ thống</h1>
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
              Cấu hình hệ thống
            </CardTitle>
            <CardDescription>
              Quản lý các thiết lập của hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <Tabs defaultValue={configGroups.length > 0 ? configGroups[0].group : "backup"}>
                <TabsList className="mb-4">
                  {configGroups.map(group => (
                    <TabsTrigger key={group.group} value={group.group}>
                      {group.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {configGroups.map(group => (
                  <TabsContent key={group.group} value={group.group} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.configs.map(config => (
                        <div key={config.key} className="space-y-2">
                          <Label htmlFor={config.key}>{config.label}</Label>
                          {renderFormItem(config)}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
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