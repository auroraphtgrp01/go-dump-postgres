import { Card, Button, Row, Col, Modal } from 'antd';
import { DatabaseOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import Toast from './Toast';

interface BackupActionsProps {
  needAuth: boolean;
  onOperationComplete?: () => void;
}

const BackupActions: React.FC<BackupActionsProps> = ({ needAuth, onOperationComplete }) => {
  const [dumpLoading, setDumpLoading] = useState(false);
  const [uploadLastLoading, setUploadLastLoading] = useState(false);
  const [uploadAllLoading, setUploadAllLoading] = useState(false);

  // Dump database
  const handleDump = async () => {
    const loadingMessage = Toast.loading('Đang dump database...');
    try {
      setDumpLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/dump', {
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

  // Upload last backup
  const handleUploadLast = async () => {
    const loadingMessage = Toast.loading('Đang upload file mới nhất...');
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
        Toast.success(result.message || 'Upload file mới nhất thành công');
        setTimeout(() => {
          if (onOperationComplete) onOperationComplete();
        }, 1000);
      } else {
        Toast.error(result.message || 'Upload file mới nhất thất bại');
      }
    } catch (error) {
      console.error('Error uploading last file:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      loadingMessage();
      setUploadLastLoading(false);
    }
  };

  // Upload all backups
  const handleUploadAll = async () => {
    Modal.confirm({
      title: 'Xác nhận',
      content: 'Bạn có chắc chắn muốn upload tất cả các file backup lên Google Drive?',
      okText: 'Đồng ý',
      cancelText: 'Hủy',
      onOk: async () => {
        const loadingMessage = Toast.loading('Đang upload tất cả file...');
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
            Toast.success(result.message || 'Upload tất cả file thành công');
            setTimeout(() => {
              if (onOperationComplete) onOperationComplete();
            }, 1000);
          } else {
            Toast.error(result.message || 'Upload tất cả file thất bại');
          }
        } catch (error) {
          console.error('Error uploading all files:', error);
          Toast.error('Lỗi kết nối máy chủ');
        } finally {
          loadingMessage();
          setUploadAllLoading(false);
        }
      },
    });
  };

  return (
    <Row gutter={16} className="mb-4">
      <Col md={12}>
        <Card 
          title="Dump Database" 
          className="shadow-sm"
          headStyle={{ backgroundColor: '#0dcaf0', color: 'white' }}
        >
          <p>Tạo bản sao lưu dữ liệu từ container Docker và lưu vào thư mục local.</p>
          <Button 
            type="primary" 
            onClick={handleDump} 
            loading={dumpLoading}
            disabled={needAuth}
            icon={<DatabaseOutlined />}
          >
            Dump Database
          </Button>
        </Card>
      </Col>
      <Col md={12}>
        <Card 
          title="Upload lên Google Drive" 
          className="shadow-sm"
          headStyle={{ backgroundColor: '#198754', color: 'white' }}
        >
          <p>Upload file backup mới nhất hoặc tất cả các file backup lên Google Drive.</p>
          <div className="flex space-x-2">
            <Button 
              type="primary" 
              onClick={handleUploadLast} 
              loading={uploadLastLoading}
              disabled={needAuth}
              icon={<CloudUploadOutlined />}
            >
              Upload File Mới Nhất
            </Button>
            <Button 
              onClick={handleUploadAll} 
              loading={uploadAllLoading}
              disabled={needAuth}
            >
              Upload Tất Cả
            </Button>
          </div>
          {needAuth && (
            <div className="mt-2 text-red-500 text-sm">
              <span>Vui lòng xác thực tài khoản Google trước khi upload</span>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default BackupActions; 