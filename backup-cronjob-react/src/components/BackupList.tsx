import { Table, Tag, Button, message, Modal } from 'antd';
import { DownloadOutlined, CloudUploadOutlined } from '@ant-design/icons';
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
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/upload/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('Upload thành công');
          // Refresh data và tải lại trang
          setTimeout(() => {
            fetchBackups();
            window.location.reload();
          }, 1000);
        } else {
          message.error(result.message || 'Upload thất bại');
        }
      } else {
        message.error('Không thể upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Lỗi kết nối máy chủ');
    }
  };

  // Confirm upload
  const confirmUpload = (id: string) => {
    Modal.confirm({
      title: 'Xác nhận',
      content: 'Bạn có chắc chắn muốn upload file này lên Google Drive?',
      okText: 'Đồng ý',
      cancelText: 'Hủy',
      onOk: () => handleUpload(id),
    });
  };

  const columns = [
    {
      title: 'Tên file',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: 'Kích thước',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
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
              onClick={() => confirmUpload(record.id)}
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