import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { isAuthenticated } from '@/utils/auth';
import Toast from '@/components/Toast';
import { 
  Settings, 
  Database, 
  Save, 
  RefreshCw, 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Pencil 
} from 'lucide-react';
import { IProfile } from '@/types';

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
  
  // Thêm state cho profiles
  const [profiles, setProfiles] = useState<IProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [newProfileDbUser, setNewProfileDbUser] = useState('');
  const [newProfileDbPassword, setNewProfileDbPassword] = useState('');
  const [newProfileContainerName, setNewProfileContainerName] = useState('');
  const [newProfileDbName, setNewProfileDbName] = useState('');
  const [newProfileGoogleClientId, setNewProfileGoogleClientId] = useState('');
  const [newProfileGoogleClientSecret, setNewProfileGoogleClientSecret] = useState('');
  const [newProfileBackupDir, setNewProfileBackupDir] = useState('./backup/');
  const [newProfileCronSchedule, setNewProfileCronSchedule] = useState('0 0 * * *');
  const [newProfileBackupRetention, setNewProfileBackupRetention] = useState(7);
  const [newProfileUploadToDrive, setNewProfileUploadToDrive] = useState(false);
  const [newProfileFolderDrive, setNewProfileFolderDrive] = useState('Postgres Backup');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // State cho dialog
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  // Thêm state cho dialog đăng nhập
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  
  // Kiểm tra trạng thái xác thực khi tải trang
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth/login');
      return;
    }

    // Fetch existing configuration
    fetchConfiguration();
    // Fetch profiles
    fetchProfiles();
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

  const fetchProfiles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/profiles', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfiles(data.profiles || []);
          // Tìm profile đang active
          const activeProfile = data.profiles.find((p: IProfile) => p.is_active);
          if (activeProfile) {
            setSelectedProfileId(activeProfile.id);
            
            // Cập nhật formValues với thông tin từ profile active
            setFormValues(prev => ({
              ...prev,
              DB_USER: activeProfile.db_user,
              DB_PASSWORD: activeProfile.db_password,
              CONTAINER_NAME: activeProfile.container_name,
              DB_NAME: activeProfile.db_name
            }));
          }
        } else {
          Toast.error(data.message || 'Không thể tải danh sách profile');
        }
      } else {
        Toast.error('Không thể tải danh sách profile');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      Toast.error('Lỗi kết nối máy chủ');
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

      // Kiểm tra mật khẩu Admin có phải dạng ẩn không
      if (dataToSubmit.ADMIN_PASSWORD === '••••••••') {
        delete dataToSubmit.ADMIN_PASSWORD;
      }
      
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
        
        // Nếu đã chọn profile, cập nhật thông tin profile
        if (selectedProfileId) {
          await updateProfileFromConfig(selectedProfileId);
        }
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
  
  // Hàm cập nhật profile từ config hiện tại
  const updateProfileFromConfig = async (profileId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const selectedProfile = profiles.find(p => p.id === profileId);
      
      if (!selectedProfile) return;
      
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: selectedProfile.name,
          description: selectedProfile.description,
          db_user: formValues.DB_USER || selectedProfile.db_user,
          db_password: formValues.DB_PASSWORD !== '••••••••' ? formValues.DB_PASSWORD : undefined,
          container_name: formValues.CONTAINER_NAME || selectedProfile.container_name,
          db_name: formValues.DB_NAME || selectedProfile.db_name
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Cập nhật profile thành công');
          fetchProfiles();
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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

  // Hàm xử lý khi thay đổi profile
  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    
    // Tìm profile được chọn
    const selectedProfile = profiles.find(p => p.id === profileId);
    if (!selectedProfile) return;
    
    // Cập nhật formValues với thông tin từ profile
    setFormValues(prev => ({
      ...prev,
      DB_USER: selectedProfile.db_user,
      DB_PASSWORD: '••••••••', // Ẩn mật khẩu
      CONTAINER_NAME: selectedProfile.container_name,
      DB_NAME: selectedProfile.db_name
    }));
  };
  
  // Hàm xử lý khi kích hoạt một profile
  const handleActivateProfile = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          is_active: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Đã kích hoạt profile');
          fetchProfiles();
          setSelectedProfileId(id);
        } else {
          Toast.error(data.message || 'Không thể kích hoạt profile');
        }
      } else {
        Toast.error('Không thể kích hoạt profile');
      }
    } catch (error) {
      console.error('Error activating profile:', error);
      Toast.error('Lỗi kết nối máy chủ');
    }
  };
  
  // Hàm tạo profile mới
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    
    setIsCreatingProfile(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: newProfileName,
          description: newProfileDescription,
          db_user: newProfileDbUser,
          db_password: newProfileDbPassword,
          container_name: newProfileContainerName,
          db_name: newProfileDbName,
          google_client_id: newProfileGoogleClientId,
          google_client_secret: newProfileGoogleClientSecret,
          backup_dir: newProfileBackupDir,
          cron_schedule: newProfileCronSchedule,
          backup_retention: newProfileBackupRetention,
          upload_to_drive: newProfileUploadToDrive,
          folder_drive: newProfileFolderDrive
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Tạo profile thành công');
          // Reset các trường form
          setNewProfileName('');
          setNewProfileDescription('');
          setNewProfileDbUser('');
          setNewProfileDbPassword('');
          setNewProfileContainerName('');
          setNewProfileDbName('');
          setNewProfileGoogleClientId('');
          setNewProfileGoogleClientSecret('');
          setNewProfileBackupDir('./backup/');
          setNewProfileCronSchedule('0 0 * * *');
          setNewProfileBackupRetention(7);
          setNewProfileUploadToDrive(false);
          setNewProfileFolderDrive('Postgres Backup');
          setIsProfileDialogOpen(false);
          fetchProfiles();
        } else {
          Toast.error(data.message || 'Không thể tạo profile');
        }
      } else {
        Toast.error('Không thể tạo profile');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsCreatingProfile(false);
    }
  };
  
  // Hàm xóa profile
  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa profile này không?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Xóa profile thành công');
          fetchProfiles();
          
          // Nếu xóa profile đang được chọn, reset selection
          if (selectedProfileId === id) {
            setSelectedProfileId('');
          }
        } else {
          Toast.error(data.message || 'Không thể xóa profile');
        }
      } else {
        Toast.error('Không thể xóa profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      Toast.error('Lỗi kết nối máy chủ');
    }
  };
  
  // Các hàm quản lý việc chỉnh sửa
  const startEditing = (profile: IProfile) => {
    setEditingProfile(profile.id);
    setEditName(profile.name);
    setEditDescription(profile.description);
  };

  const cancelEditing = () => {
    setEditingProfile(null);
    setEditName('');
    setEditDescription('');
  };

  const handleUpdateProfile = async (id: string) => {
    if (!editName.trim()) {
      cancelEditing();
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Cập nhật profile thành công');
          setEditingProfile(null);
          fetchProfiles();
        } else {
          Toast.error(data.message || 'Không thể cập nhật profile');
        }
      } else {
        Toast.error('Không thể cập nhật profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.error('Lỗi kết nối máy chủ');
    }
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
            onCheckedChange={(checked: boolean) => handleSwitchChange(config.key, checked)}
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

      {/* Dialog thông tin đăng nhập */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Thông tin đăng nhập hệ thống
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin đăng nhập cho tài khoản quản trị
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin_username">Tên đăng nhập Admin</Label>
              <Input
                id="admin_username"
                value={formValues.ADMIN_USERNAME || ''}
                onChange={(e) => handleInputChange('ADMIN_USERNAME', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_password">Mật khẩu Admin</Label>
              <Input
                id="admin_password"
                type="password"
                value={formValues.ADMIN_PASSWORD || ''}
                onChange={(e) => handleInputChange('ADMIN_PASSWORD', e.target.value)}
                placeholder={formValues.ADMIN_PASSWORD ? '••••••••' : 'Nhập mật khẩu mới'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsLoginDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button 
              onClick={() => {
                handleSave({ preventDefault: () => {} } as React.FormEvent);
                setIsLoginDialogOpen(false);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isFetchingConfig ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Đang tải cấu hình...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel quản lý profile */}
          <div className="lg:col-span-1">
            <Card className="shadow-md mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Quản lý Profiles
                </CardTitle>
                <CardDescription>
                  Chọn hoặc tạo profile cấu hình
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Button đăng nhập hệ thống */}
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setIsLoginDialogOpen(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Cập nhật thông tin đăng nhập
                  </Button>
                  
                  {/* Danh sách profiles */}
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <Label>Danh sách Profiles</Label>
                      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1">
                            <Plus className="h-3.5 w-3.5" />
                            Thêm mới
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Plus className="h-5 w-5" />
                              Tạo Profile Mới
                            </DialogTitle>
                            <DialogDescription>
                              Tạo profile mới với các cấu hình chỉ định cho cơ sở dữ liệu
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                            <Tabs defaultValue="basic" className="w-full">
                              <TabsList className="mb-4 w-full grid grid-cols-3">
                                <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                                <TabsTrigger value="backup">Sao lưu</TabsTrigger>
                                <TabsTrigger value="google">Google Drive</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="basic" className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="profile-name">Tên Profile *</Label>
                                  <Input 
                                    id="profile-name"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder="Nhập tên profile"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-description">Mô tả</Label>
                                  <Input 
                                    id="profile-description"
                                    value={newProfileDescription}
                                    onChange={(e) => setNewProfileDescription(e.target.value)}
                                    placeholder="Mô tả ngắn gọn về profile (tùy chọn)"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-db-user">Tên đăng nhập Database *</Label>
                                  <Input 
                                    id="profile-db-user"
                                    value={newProfileDbUser}
                                    onChange={(e) => setNewProfileDbUser(e.target.value)}
                                    placeholder="Ví dụ: postgres"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-db-password">Mật khẩu Database *</Label>
                                  <Input 
                                    id="profile-db-password"
                                    type="password"
                                    value={newProfileDbPassword}
                                    onChange={(e) => setNewProfileDbPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu database"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-container-name">Tên Container *</Label>
                                  <Input 
                                    id="profile-container-name"
                                    value={newProfileContainerName}
                                    onChange={(e) => setNewProfileContainerName(e.target.value)}
                                    placeholder="Ví dụ: postgres-container"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-db-name">Tên Database *</Label>
                                  <Input 
                                    id="profile-db-name"
                                    value={newProfileDbName}
                                    onChange={(e) => setNewProfileDbName(e.target.value)}
                                    placeholder="Ví dụ: mydb"
                                  />
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="backup" className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="profile-backup-dir">Thư mục lưu backup</Label>
                                  <Input 
                                    id="profile-backup-dir"
                                    value={newProfileBackupDir}
                                    onChange={(e) => setNewProfileBackupDir(e.target.value)}
                                    placeholder="Ví dụ: ./backup/"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-cron-schedule">Lịch sao lưu tự động (Cron)</Label>
                                  <Input 
                                    id="profile-cron-schedule"
                                    value={newProfileCronSchedule}
                                    onChange={(e) => setNewProfileCronSchedule(e.target.value)}
                                    placeholder="Ví dụ: 0 0 * * * (chạy lúc 00:00 hàng ngày)"
                                  />
                                  <p className="text-xs text-gray-500">Format: phút giờ ngày tháng thứ (0 0 * * * = 00:00 hàng ngày)</p>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-backup-retention">Thời gian lưu trữ (ngày)</Label>
                                  <Input 
                                    id="profile-backup-retention"
                                    type="number"
                                    min={1}
                                    value={newProfileBackupRetention}
                                    onChange={(e) => setNewProfileBackupRetention(parseInt(e.target.value))}
                                    placeholder="Ví dụ: 7"
                                  />
                                  <p className="text-xs text-gray-500">Số ngày giữ file backup trước khi tự động xóa</p>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="google" className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id="profile-upload-to-drive"
                                      checked={newProfileUploadToDrive}
                                      onCheckedChange={setNewProfileUploadToDrive}
                                    />
                                    <Label htmlFor="profile-upload-to-drive">Tự động upload lên Google Drive</Label>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="profile-google-client-id">Google Client ID</Label>
                                  <Input 
                                    id="profile-google-client-id"
                                    value={newProfileGoogleClientId}
                                    onChange={(e) => setNewProfileGoogleClientId(e.target.value)}
                                    placeholder="Nhập Google Client ID"
                                    disabled={!newProfileUploadToDrive}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-google-client-secret">Google Client Secret</Label>
                                  <Input 
                                    id="profile-google-client-secret"
                                    type="password"
                                    value={newProfileGoogleClientSecret}
                                    onChange={(e) => setNewProfileGoogleClientSecret(e.target.value)}
                                    placeholder="Nhập Google Client Secret"
                                    disabled={!newProfileUploadToDrive}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="profile-folder-drive">Tên thư mục trên Google Drive</Label>
                                  <Input 
                                    id="profile-folder-drive"
                                    value={newProfileFolderDrive}
                                    onChange={(e) => setNewProfileFolderDrive(e.target.value)}
                                    placeholder="Ví dụ: Postgres Backup"
                                    disabled={!newProfileUploadToDrive}
                                  />
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                          <DialogFooter>
                            <Button 
                              variant="outline" 
                              onClick={() => setIsProfileDialogOpen(false)}
                            >
                              Hủy
                            </Button>
                            <Button 
                              onClick={handleCreateProfile} 
                              disabled={isCreatingProfile || !newProfileName.trim() || !newProfileDbUser.trim() || !newProfileContainerName.trim() || !newProfileDbName.trim()}
                            >
                              {isCreatingProfile ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
                              Tạo profile
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="border rounded-md divide-y">
                      {profiles.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Chưa có profile nào
                        </div>
                      ) : (
                        profiles.map(profile => (
                          <div key={profile.id} className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-900/10 transition-colors ${
                            selectedProfileId === profile.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                          }`} onClick={() => handleProfileChange(profile.id)}>
                            {editingProfile === profile.id ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-name-${profile.id}`} className="text-sm font-medium">Tên profile</Label>
                                  <Input 
                                    id={`edit-name-${profile.id}`}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Tên profile"
                                    className="mb-2"
                                    autoFocus
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-desc-${profile.id}`} className="text-sm font-medium">Mô tả</Label>
                                  <Input 
                                    id={`edit-desc-${profile.id}`}
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Mô tả profile (tùy chọn)"
                                    className="mb-2"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={cancelEditing}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Hủy
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleUpdateProfile(profile.id)}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Lưu
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium flex items-center">
                                      {profile.name}
                                      {profile.is_active && (
                                        <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {profile.description || 'Không có mô tả'}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    {!profile.is_active && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8"
                                        onClick={() => handleActivateProfile(profile.id)}
                                        title="Kích hoạt profile này"
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Kích hoạt
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8"
                                      onClick={() => startEditing(profile)}
                                      title="Sửa profile"
                                    >
                                      <Pencil className="h-4 w-4 mr-1" />
                                      Sửa
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteProfile(profile.id)}
                                      title="Xóa profile"
                                      disabled={profile.is_active}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Xóa
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Phần cấu hình chính */}
          <div className="lg:col-span-2">
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
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tải lại
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Lưu cấu hình
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigPage; 