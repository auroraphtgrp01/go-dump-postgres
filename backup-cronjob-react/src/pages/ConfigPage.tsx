import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Divider, message, Switch } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { isAuthenticated } from '../utils/auth';

interface ConfigValues {
  backup_dir: string;
  drive_folder_id: string;
  backup_retention_days: number;
  enable_cron: boolean;
  cron_schedule: string;
}

const ConfigPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
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
            form.setFieldsValue(data.configs);
          }
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        message.error('Lỗi khi tải cấu hình');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, [form]);
  
  // Save config
  const handleSave = async (values: ConfigValues) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/configs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configs: values }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          message.success('Lưu cấu hình thành công');
        } else {
          message.error(data.message || 'Lưu cấu hình thất bại');
        }
      } else {
        message.error('Lưu cấu hình thất bại');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      message.error('Lỗi khi lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
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
            initialValues={{
              backup_dir: '/backups',
              backup_retention_days: 30,
              enable_cron: true,
              cron_schedule: '0 0 * * *',
            }}
          >
            <Divider orientation="left">Cấu hình Backup</Divider>
            
            <Form.Item
              name="backup_dir"
              label="Thư mục lưu backup"
              rules={[{ required: true, message: 'Vui lòng nhập thư mục backup!' }]}
            >
              <Input placeholder="/path/to/backup/directory" />
            </Form.Item>
            
            <Form.Item
              name="backup_retention_days"
              label="Số ngày lưu giữ backup"
              rules={[{ required: true, message: 'Vui lòng nhập số ngày!' }]}
            >
              <Input type="number" min={1} />
            </Form.Item>
            
            <Divider orientation="left">Cấu hình Google Drive</Divider>
            
            <Form.Item
              name="drive_folder_id"
              label="ID thư mục Google Drive"
              rules={[{ required: true, message: 'Vui lòng nhập ID thư mục Drive!' }]}
            >
              <Input placeholder="1a2b3c4d5e..." />
            </Form.Item>
            
            <Divider orientation="left">Cấu hình Cron</Divider>
            
            <Form.Item
              name="enable_cron"
              label="Bật lịch tự động backup"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="cron_schedule"
              label="Lịch backup (định dạng cron)"
              rules={[{ required: true, message: 'Vui lòng nhập lịch cron!' }]}
            >
              <Input placeholder="0 0 * * *" />
            </Form.Item>
            
            <Form.Item>
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