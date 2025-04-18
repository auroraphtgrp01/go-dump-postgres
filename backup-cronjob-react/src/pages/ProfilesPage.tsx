import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Popconfirm, message, Switch, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { isAuthenticated } from '../utils/auth';

// Định nghĩa interface cho dữ liệu profile
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

const ProfilesPage = () => {
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DatabaseProfile | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);
  
  // Fetch profiles
  useEffect(() => {
    fetchProfiles();
  }, []);
  
  const fetchProfiles = async () => {
    try {
      setLoading(true);
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
        }
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      messageApi.error({
        content: 'Lỗi khi tải danh sách profile',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Set active profile
  const setActiveProfile = async (id: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        messageApi.success({
          content: data.message || 'Đã đặt profile làm hoạt động',
          duration: 5,
        });
        fetchProfiles();
      } else {
        messageApi.error({
          content: data.error || 'Không thể đặt profile làm hoạt động',
          duration: 5,
        });
      }
    } catch (error) {
      console.error('Error setting active profile:', error);
      messageApi.error({
        content: 'Lỗi khi thiết lập profile hoạt động',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Delete profile
  const deleteProfile = async (id: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        messageApi.success({
          content: data.message || 'Xóa profile thành công',
          duration: 5,
        });
        fetchProfiles();
      } else {
        messageApi.error({
          content: data.error || 'Không thể xóa profile',
          duration: 5,
        });
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      messageApi.error({
        content: 'Lỗi khi xóa profile',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Save profile
  const saveProfile = async (values: Omit<DatabaseProfile, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const method = editingProfile ? 'PUT' : 'POST';
      const url = editingProfile 
        ? `/api/profiles/${editingProfile.id}` 
        : '/api/profiles';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        messageApi.success({
          content: data.message || (editingProfile ? 'Cập nhật profile thành công' : 'Tạo profile thành công'),
          duration: 5,
        });
        setModalVisible(false);
        fetchProfiles();
      } else {
        messageApi.error({
          content: data.error || 'Không thể lưu profile',
          duration: 5,
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      messageApi.error({
        content: 'Lỗi khi lưu profile',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Show modal to add/edit profile
  const showProfileModal = (profile?: DatabaseProfile) => {
    setEditingProfile(profile || null);
    
    if (profile) {
      form.setFieldsValue({
        name: profile.name,
        description: profile.description,
        db_user: profile.db_user,
        db_password: '', // Không hiển thị mật khẩu cũ
        container_name: profile.container_name,
        db_name: profile.db_name,
        is_active: profile.is_active,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        is_active: true,
      });
    }
    
    setModalVisible(true);
  };
  
  // Columns for profiles table
  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DatabaseProfile) => (
        <div>
          {text} {record.is_active && <Tag color="green">Đang hoạt động</Tag>}
        </div>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Database',
      key: 'database',
      render: (text: string, record: DatabaseProfile) => (
        <div>
          <div><strong>Tên DB:</strong> {record.db_name}</div>
          <div><strong>User:</strong> {record.db_user}</div>
          <div><strong>Container:</strong> {record.container_name}</div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (text: string, record: DatabaseProfile) => (
        <div className="space-x-2">
          <Button 
            type="primary" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => showProfileModal(record)}
          >
            Sửa
          </Button>
          
          {!record.is_active && (
            <Button 
              type="default" 
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => setActiveProfile(record.id)}
            >
              Đặt làm hoạt động
            </Button>
          )}
          
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa profile này?"
            onConfirm={() => deleteProfile(record.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button 
              danger 
              size="small"
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];
  
  return (
    <div>
      {contextHolder}
      <Header />
      
      <div className="container mx-auto my-4 px-4">
        <Card 
          title="Quản lý Profile Database" 
          className="shadow-sm"
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showProfileModal()}
            >
              Thêm Profile
            </Button>
          }
        >
          <p className="mb-4">
            Profile Database giúp bạn lưu trữ và quản lý nhiều cấu hình kết nối database khác nhau.
            Khi thực hiện backup, bạn có thể chọn một trong các profile đã định nghĩa.
          </p>
          
          <Table 
            dataSource={profiles} 
            columns={columns} 
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
      
      <Modal
        title={editingProfile ? 'Chỉnh sửa Profile' : 'Thêm Profile mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveProfile}
        >
          <Form.Item
            name="name"
            label="Tên Profile"
            rules={[{ required: true, message: 'Vui lòng nhập tên profile!' }]}
          >
            <Input placeholder="Ví dụ: PostgreSQL Production" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Mô tả"
          >
            <Input.TextArea placeholder="Mô tả ngắn về profile này" />
          </Form.Item>
          
          <Form.Item
            name="db_user"
            label="Tên người dùng Database"
            rules={[{ required: true, message: 'Vui lòng nhập tên người dùng database!' }]}
          >
            <Input placeholder="Ví dụ: postgres" />
          </Form.Item>
          
          <Form.Item
            name="db_password"
            label="Mật khẩu Database"
            rules={[
              { required: !editingProfile, message: 'Vui lòng nhập mật khẩu database!' },
              { message: editingProfile ? 'Để trống nếu không muốn thay đổi mật khẩu' : '' }
            ]}
          >
            <Input.Password placeholder={editingProfile ? 'Nhập để thay đổi mật khẩu' : 'Nhập mật khẩu database'} />
          </Form.Item>
          
          <Form.Item
            name="container_name"
            label="Tên Container Docker"
            rules={[{ required: true, message: 'Vui lòng nhập tên container!' }]}
          >
            <Input placeholder="Ví dụ: postgres" />
          </Form.Item>
          
          <Form.Item
            name="db_name"
            label="Tên Database"
            rules={[{ required: true, message: 'Vui lòng nhập tên database!' }]}
          >
            <Input placeholder="Ví dụ: mydatabase" />
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Không hoạt động" />
          </Form.Item>
          
          <Form.Item className="text-right">
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {editingProfile ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfilesPage;