import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Switch, Tabs } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { isAuthenticated } from '../utils/auth';

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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);
  
  // Fetch current config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/configs', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConfigGroups(data.data);
            
            // Chuẩn bị dữ liệu cho form
            const formValues: Record<string, string> = {};
            data.data.forEach((group: ConfigGroup) => {
              group.configs.forEach((config: ConfigItem) => {
                formValues[config.key] = config.value;
              });
            });
            
            form.setFieldsValue(formValues);
          }
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        messageApi.error({
          content: 'Lỗi khi tải cấu hình',
          duration: 5,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, [form, messageApi]);
  
  // Save config
  const handleSave = async (values: Record<string, string>) => {
    try {
      setLoading(true);

      // Tạo bản sao của values để xử lý
      const dataToSubmit = { ...values };
      
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
      
      if (response.ok && data.success) {
        messageApi.success({
          content: 'Lưu cấu hình thành công',
          duration: 5,
        });
      } else {
        messageApi.error({
          content: data.message || 'Lưu cấu hình thất bại',
          duration: 5,
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      messageApi.error({
        content: 'Lỗi khi lưu cấu hình',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Render form item based on config type
  const renderFormItem = (config: ConfigItem) => {
    // Không cho sửa JWT_SECRET
    if (config.key === 'JWT_SECRET') {
      return <Input.Password placeholder={config.label} disabled />;
    }
    
    switch (config.type) {
      case 'password':
        return <Input.Password placeholder={config.label} />;
      case 'number':
        return <Input type="number" min={1} placeholder={config.label} />;
      case 'switch':
        return <Switch />;
      default:
        return <Input placeholder={config.label} />;
    }
  };
  
  return (
    <div>
      {contextHolder}
      <Header />
      
      <div className="container mx-auto my-4 px-4">
        <Card
          title="Cấu hình hệ thống"
          className="shadow-sm"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Tabs 
              defaultActiveKey="backup"
              items={configGroups.map((group) => ({
                key: group.group,
                label: group.label,
                children: (
                  <div className="p-4">
                    {group.configs.map((config) => (
                      <Form.Item
                        key={config.key}
                        name={config.key}
                        label={config.label}
                        rules={[{ required: true, message: `Vui lòng nhập ${config.label}!` }]}
                        valuePropName={config.type === 'switch' ? 'checked' : 'value'}
                      >
                        {renderFormItem(config)}
                      </Form.Item>
                    ))}
                  </div>
                ),
              }))}
            />
            
            <Form.Item className="mt-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
              >
                Lưu cấu hình
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ConfigPage; 