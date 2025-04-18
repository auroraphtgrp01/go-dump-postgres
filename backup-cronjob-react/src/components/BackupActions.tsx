import { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Select, Form } from 'antd';
import { DatabaseOutlined, CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import Toast from './Toast';

// Thêm định nghĩa interface DatabaseProfile
interface DatabaseProfile {
  id: number;
  name: string;
  description: string;
  db_user: string;
  db_password: string;
  container_name: string;
  db_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BackupActionsProps {
  needAuth: boolean;
  onOperationComplete?: () => void;
}

const BackupActions: React.FC<BackupActionsProps> = ({ needAuth, onOperationComplete }) => {
  const [dumpLoading, setDumpLoading] = useState(false);
  const [uploadLastLoading, setUploadLastLoading] = useState(false);
  const [uploadAllLoading, setUploadAllLoading] = useState(false);
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  // Fetch database profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoadingProfiles(true);
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/profiles', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setProfiles(data.profiles);
            
            // Tìm profile đang active và set làm mặc định
            const activeProfile = data.profiles.find((p: DatabaseProfile) => p.is_active);
            if (activeProfile) {
              setSelectedProfileId(activeProfile.id);
            } else if (data.profiles.length > 0) {
              setSelectedProfileId(data.profiles[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
        Toast.error('Lỗi khi tải danh sách profile');
      } finally {
        setLoadingProfiles(false);
      }
    };
    
    fetchProfiles();
  }, []);

  // Dump database
  const handleDump = async () => {
    if (!selectedProfileId) {
      Toast.error('Vui lòng chọn profile để dump');
      return;
    }
    
    const loadingMessage = Toast.loading('Đang dump database...');
    try {
      setDumpLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/dump?profile_id=${selectedProfileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Dump thành công:', result.message);
        Toast.success(result.message || 'Dump database thành công');
        setTimeout(() => {
          if (onOperationComplete) onOperationComplete();
        }, 1000);
      } else {
        console.error('Dump thất bại:', result.message);
        Toast.error(result.message || 'Dump database thất bại');
      }
    } catch (error) {
      console.error('Error dumping database:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      loadingMessage();
      setDumpLoading(false);
    }
  };

  // Upload backup mới nhất
  const handleUploadLast = async () => {
    const loadingMessage = Toast.loading('Đang upload backup mới nhất...');
    try {
      setUploadLastLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/upload-last', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Upload thành công:', result.message);
        Toast.success(result.message || 'Upload backup thành công');
        setTimeout(() => {
          if (onOperationComplete) onOperationComplete();
        }, 1000);
      } else {
        console.error('Upload thất bại:', result.message);
        Toast.error(result.message || 'Upload backup thất bại');
      }
    } catch (error) {
      console.error('Error uploading backup:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      loadingMessage();
      setUploadLastLoading(false);
    }
  };

  // Upload tất cả backups
  const handleUploadAll = async () => {
    const loadingMessage = Toast.loading('Đang upload tất cả backups...');
    try {
      setUploadAllLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/upload-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('Upload tất cả thành công:', result.message);
        Toast.success(result.message || 'Upload tất cả backups thành công');
        setTimeout(() => {
          if (onOperationComplete) onOperationComplete();
        }, 1000);
      } else {
        console.error('Upload tất cả thất bại:', result.message);
        Toast.error(result.message || 'Upload tất cả backups thất bại');
      }
    } catch (error) {
      console.error('Error uploading all backups:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      loadingMessage();
      setUploadAllLoading(false);
    }
  };

  return (
    <Card title="Thao tác Backup" className="shadow-sm mb-4">
      <Form layout="vertical">
        <Form.Item 
          label="Chọn Profile Database" 
          help="Chọn cấu hình database để thực hiện backup"
        >
          <Select
            placeholder="Chọn profile"
            loading={loadingProfiles}
            value={selectedProfileId}
            onChange={(value) => setSelectedProfileId(value)}
            style={{ width: '100%' }}
            optionFilterProp="children"
          >
            {profiles.map((profile) => (
              <Select.Option key={profile.id} value={profile.id}>
                {profile.name} ({profile.db_name}@{profile.container_name})
                {profile.is_active && ' (Đang hoạt động)'}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
      
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <Button
            type="primary"
            icon={<DatabaseOutlined />}
            loading={dumpLoading}
            onClick={handleDump}
            disabled={!selectedProfileId}
            block
            className="mb-2"
          >
            Dump Database
          </Button>
        </Col>
        <Col xs={24} sm={8}>
          <Button
            type="default"
            icon={<CloudUploadOutlined />}
            loading={uploadLastLoading}
            onClick={handleUploadLast}
            block
            className="mb-2"
          >
            Upload Backup Mới Nhất
          </Button>
        </Col>
        <Col xs={24} sm={8}>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            loading={uploadAllLoading}
            onClick={handleUploadAll}
            block
          >
            Upload Tất Cả
          </Button>
        </Col>
      </Row>
      
      {needAuth && (
        <div className="text-center mt-4">
          <p className="text-danger">
            Bạn cần xác thực Google Drive để upload backup.
          </p>
        </div>
      )}
    </Card>
  );
};

export default BackupActions;