import { Table, Tag, Button, message } from 'antd';
import { DownloadOutlined, CloudUploadOutlined, LinkOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { IBackupFile } from '../types';
import { formatFileSize } from '../utils/helpers';

interface BackupListProps {
  needAuth: boolean;
}

const BackupList: React.FC<BackupListProps> = ({ needAuth }) => {
  const [backups, setBackups] = useState<IBackupFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch backup data
  const fetchBackups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/backups', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      } else {
        message.error('Không thể tải danh sách file backup');
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      message.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!needAuth) {
      fetchBackups();
    }
  }, [needAuth]);

  // Upload a single backup
  const handleUpload = async (id: string) => {
    console.log('Bắt đầu upload file ID:', id);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Token từ localStorage:', token ? `${token.substring(0, 10)}...` : 'không có');
      
      // Hiển thị thông báo loading - dùng hàm đơn giản hơn
      message.loading('Đang upload file lên Google Drive...', 0);
      
      const response = await fetch(`/upload/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      // Đóng tất cả thông báo đang hiển thị
      message.destroy();
      
      if (response.ok) {
        const result = await response.json();
        console.log('Kết quả upload:', result);
        
        if (result.success) {
          // Hiển thị thông báo thành công dùng cách đơn giản
          message.success('Upload thành công');
          // Refresh data
          setTimeout(() => {
            fetchBackups();
          }, 1000);
        } else {
          console.error('Upload thất bại:', result.message);
          message.error(result.message || 'Upload thất bại');
        }
      } else {
        const errorText = await response.text();
        console.error('Lỗi response:', response.status, errorText);
        
        if (response.status === 401) {
          message.error('Phiên làm việc hết hạn, vui lòng đăng nhập lại');
        } else {
          message.error(`Không thể upload file (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      message.destroy(); // Đảm bảo đóng thông báo loading nếu có lỗi
      message.error('Lỗi kết nối máy chủ');
    }
  };

  // Format date from ISO string
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleString('vi-VN', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Ensure file size is formatted properly
  const safeFormatSize = (size: number | null | undefined) => {
    if (size === null || size === undefined) return 'N/A';
    return formatFileSize(size);
  };

  const columns = [
    {
      title: 'Tên file',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | null | undefined) => name || 'Không có tên',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => formatDate(createdAt),
    },
    {
      title: 'Kích thước',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => safeFormatSize(size),
    },
    {
      title: 'Đã upload',
      dataIndex: 'uploaded',
      key: 'uploaded',
      render: (uploaded: boolean) => (
        uploaded ? 
          <Tag color="success" className="badge-success">Đã upload</Tag> : 
          <Tag color="warning" className="badge-warning">Chưa upload</Tag>
      ),
    },
    {
      title: 'Google Drive',
      dataIndex: 'driveLink',
      key: 'driveLink',
      render: (driveLink: string, record: IBackupFile) => (
        driveLink && record.uploaded ? (
          <Button 
            type="link" 
            icon={<LinkOutlined />} 
            href={driveLink} 
            target="_blank"
            size="small"
          >
            Xem trên Drive
          </Button>
        ) : (
          <span>-</span>
        )
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: IBackupFile) => (
        <div className="flex space-x-2">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            size="small"
            href={`/download/${record.id}`}
            disabled={needAuth}
            ghost
          >
            Tải xuống
          </Button>
          
          {!record.uploaded && (
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              size="small"
              onClick={() => handleUpload(record.id)}
              disabled={needAuth}
            >
              Upload
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (needAuth) {
    return null;
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="bg-gray-600 text-white p-4">
        <h5 className="text-lg font-medium m-0">Danh sách file backup</h5>
      </div>
      <div className="p-0">
        <Table 
          dataSource={backups} 
          columns={columns} 
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chưa có file backup nào' }}
        />
      </div>
    </div>
  );
};

export default BackupList; 