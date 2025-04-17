import { Card, Button, message, Row, Col, Modal } from 'antd';
import { DatabaseOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useState } from 'react';

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
    try {
      setDumpLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/dump', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('Dump database thành công');
          if (onOperationComplete) onOperationComplete();
        } else {
          message.error(result.message || 'Dump database thất bại');
        }
      } else {
        message.error('Không thể dump database');
      }
    } catch (error) {
      console.error('Error dumping database:', error);
      message.error('Lỗi kết nối máy chủ');
    } finally {
      setDumpLoading(false);
    }
  };

  // Upload last backup
  const handleUploadLast = async () => {
    try {
      setUploadLastLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/upload-last', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('Upload file mới nhất thành công');
          if (onOperationComplete) onOperationComplete();
        } else {
          message.error(result.message || 'Upload file mới nhất thất bại');
        }
      } else {
        message.error('Không thể upload file');
      }
    } catch (error) {
      console.error('Error uploading last file:', error);
      message.error('Lỗi kết nối máy chủ');
    } finally {
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
        try {
          setUploadAllLoading(true);
          const token = localStorage.getItem('auth_token');
          const response = await fetch('/upload-all', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              message.success('Upload tất cả file thành công');
              if (onOperationComplete) onOperationComplete();
            } else {
              message.error(result.message || 'Upload tất cả file thất bại');
            }
          } else {
            message.error('Không thể upload file');
          }
        } catch (error) {
          console.error('Error uploading all files:', error);
          message.error('Lỗi kết nối máy chủ');
        } finally {
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