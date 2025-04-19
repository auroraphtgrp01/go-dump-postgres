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
    <div className="container max-w-screen-xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      {/* Header section with gradient background */}
      <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 p-6 shadow-md border border-indigo-100/80 dark:border-indigo-900/20">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/3 translate-x-1/3 rounded-full bg-indigo-200/40 dark:bg-indigo-400/10 blur-2xl"></div>
        <div className="absolute left-1/4 bottom-0 h-24 w-24 translate-y-1/3 rounded-full bg-blue-300/30 dark:bg-blue-500/10 blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 dark:from-indigo-600 dark:to-blue-700 shadow-md shadow-indigo-500/20 dark:shadow-indigo-900/30">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">
                Cấu hình hệ thống
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg">
                Quản lý cấu hình và profile hệ thống PostgreSQL Backup Manager
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="border-blue-200 bg-white/80 text-blue-700 hover:bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-all"
            onClick={() => setIsLoginDialogOpen(true)}
          >
            <Users className="w-4 h-4 mr-2" />
            Cập nhật thông tin đăng nhập
          </Button>
        </div>
      </div>

      {/* Dialog thông tin đăng nhập */}
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Thông tin đăng nhập hệ thống
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin đăng nhập cho tài khoản quản trị
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin_username" className="text-sm font-medium">Tên đăng nhập Admin</Label>
              <Input
                id="admin_username"
                value={formValues.ADMIN_USERNAME || ''}
                onChange={(e) => handleInputChange('ADMIN_USERNAME', e.target.value)}
                required
                className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin_password" className="text-sm font-medium">Mật khẩu Admin</Label>
              <Input
                id="admin_password"
                type="password"
                value={formValues.ADMIN_PASSWORD || ''}
                onChange={(e) => handleInputChange('ADMIN_PASSWORD', e.target.value)}
                placeholder={formValues.ADMIN_PASSWORD ? '••••••••' : 'Nhập mật khẩu mới'}
                className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsLoginDialogOpen(false)}
              className="border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              Hủy
            </Button>
            <Button 
              onClick={() => {
                handleSave({ preventDefault: () => {} } as React.FormEvent);
                setIsLoginDialogOpen(false);
              }}
              disabled={isLoading}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm"
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
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-blue-500 animate-spin animation-delay-500"></div>
            <div className="absolute inset-4 rounded-full border-l-2 border-t-2 border-indigo-400 animate-spin animation-delay-1000"></div>
          </div>
          <p className="mt-6 text-gray-500 dark:text-gray-400 font-medium">Đang tải cấu hình...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Panel quản lý profile */}
          <div className="lg:w-1/3 space-y-6">
            <Card className="overflow-hidden border-gray-100 dark:border-gray-800 shadow-md flex flex-col h-full">
              <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/50 dark:to-blue-950/40 border-b border-indigo-100/80 dark:border-indigo-800/20 p-5">
                <CardTitle className="flex items-center text-indigo-800 dark:text-indigo-300">
                  <Users className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Quản lý Profiles
                </CardTitle>
                <CardDescription>
                  Chọn hoặc tạo profile cấu hình
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-5">
                  {/* Danh sách profiles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Danh sách Profiles</Label>
                      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            className="h-8 gap-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm mới
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                                <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              Tạo Profile Mới
                            </DialogTitle>
                            <DialogDescription>
                              Tạo profile mới với các cấu hình chỉ định cho cơ sở dữ liệu
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto pr-1">
                            <Tabs defaultValue="basic" className="w-full">
                              <TabsList className="mb-4 w-full grid grid-cols-3">
                                <TabsTrigger value="basic" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Cơ bản</TabsTrigger>
                                <TabsTrigger value="backup" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Sao lưu</TabsTrigger>
                                <TabsTrigger value="google" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Google Drive</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="basic" className="space-y-4 animate-in fade-in-50 duration-200">
                                <div className="p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/20 mb-3">
                                  <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-1">Thông tin cơ bản</h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Nhập thông tin cơ bản và thông tin kết nối database</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-name" className="text-sm font-medium">Tên Profile *</Label>
                                    <Input 
                                      id="profile-name"
                                      value={newProfileName}
                                      onChange={(e) => setNewProfileName(e.target.value)}
                                      placeholder="Nhập tên profile"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-description" className="text-sm font-medium">Mô tả</Label>
                                    <Input 
                                      id="profile-description"
                                      value={newProfileDescription}
                                      onChange={(e) => setNewProfileDescription(e.target.value)}
                                      placeholder="Mô tả ngắn gọn về profile (tùy chọn)"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                </div>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-db-user" className="text-sm font-medium">Tên đăng nhập Database *</Label>
                                    <Input 
                                      id="profile-db-user"
                                      value={newProfileDbUser}
                                      onChange={(e) => setNewProfileDbUser(e.target.value)}
                                      placeholder="Ví dụ: postgres"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-db-password" className="text-sm font-medium">Mật khẩu Database *</Label>
                                    <Input 
                                      id="profile-db-password"
                                      type="password"
                                      value={newProfileDbPassword}
                                      onChange={(e) => setNewProfileDbPassword(e.target.value)}
                                      placeholder="Nhập mật khẩu database"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                </div>
                                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-container-name" className="text-sm font-medium">Tên Container *</Label>
                                    <Input 
                                      id="profile-container-name"
                                      value={newProfileContainerName}
                                      onChange={(e) => setNewProfileContainerName(e.target.value)}
                                      placeholder="Ví dụ: postgres-container"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-db-name" className="text-sm font-medium">Tên Database *</Label>
                                    <Input 
                                      id="profile-db-name"
                                      value={newProfileDbName}
                                      onChange={(e) => setNewProfileDbName(e.target.value)}
                                      placeholder="Ví dụ: mydb"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="backup" className="space-y-4 animate-in fade-in-50 duration-200">
                                <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/20 mb-3">
                                  <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Cấu hình sao lưu</h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Cấu hình các tùy chọn sao lưu tự động</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-backup-dir" className="text-sm font-medium">Thư mục lưu backup</Label>
                                    <Input 
                                      id="profile-backup-dir"
                                      value={newProfileBackupDir}
                                      onChange={(e) => setNewProfileBackupDir(e.target.value)}
                                      placeholder="Ví dụ: ./backup/"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Đường dẫn đến thư mục lưu trữ các file backup</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-cron-schedule" className="text-sm font-medium">Lịch sao lưu tự động (Cron)</Label>
                                    <Input 
                                      id="profile-cron-schedule"
                                      value={newProfileCronSchedule}
                                      onChange={(e) => setNewProfileCronSchedule(e.target.value)}
                                      placeholder="Ví dụ: 0 0 * * * (chạy lúc 00:00 hàng ngày)"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                    <p className="text-xs flex flex-wrap gap-1 mt-1 text-gray-500 dark:text-gray-400">
                                      Format: phút giờ ngày tháng thứ 
                                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">(0 0 * * * = 00:00 hàng ngày)</span>
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-backup-retention" className="text-sm font-medium">Thời gian lưu trữ (ngày)</Label>
                                    <Input 
                                      id="profile-backup-retention"
                                      type="number"
                                      min={1}
                                      value={newProfileBackupRetention}
                                      onChange={(e) => setNewProfileBackupRetention(parseInt(e.target.value))}
                                      placeholder="Ví dụ: 7"
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Số ngày giữ file backup trước khi tự động xóa</p>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="google" className="space-y-4 animate-in fade-in-50 duration-200">
                                <div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/20 mb-3">
                                  <h3 className="font-medium text-green-800 dark:text-green-300 mb-1">Tích hợp Google Drive</h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Cấu hình tự động sao lưu lên Google Drive</p>
                                </div>
                                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900/50">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id="profile-upload-to-drive"
                                      checked={newProfileUploadToDrive}
                                      onCheckedChange={setNewProfileUploadToDrive}
                                      className="data-[state=checked]:bg-green-600"
                                    />
                                    <Label htmlFor="profile-upload-to-drive" className="font-medium">Tự động upload lên Google Drive</Label>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-10">
                                    Khi bật, các bản sao lưu sẽ tự động được tải lên Google Drive
                                  </p>
                                </div>
                                
                                <div className={`space-y-4 ${!newProfileUploadToDrive ? 'opacity-60' : ''}`}>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-google-client-id" className="text-sm font-medium">Google Client ID</Label>
                                    <Input 
                                      id="profile-google-client-id"
                                      value={newProfileGoogleClientId}
                                      onChange={(e) => setNewProfileGoogleClientId(e.target.value)}
                                      placeholder="Nhập Google Client ID"
                                      disabled={!newProfileUploadToDrive}
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-google-client-secret" className="text-sm font-medium">Google Client Secret</Label>
                                    <Input 
                                      id="profile-google-client-secret"
                                      type="password"
                                      value={newProfileGoogleClientSecret}
                                      onChange={(e) => setNewProfileGoogleClientSecret(e.target.value)}
                                      placeholder="Nhập Google Client Secret"
                                      disabled={!newProfileUploadToDrive}
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="profile-folder-drive" className="text-sm font-medium">Tên thư mục trên Google Drive</Label>
                                    <Input 
                                      id="profile-folder-drive"
                                      value={newProfileFolderDrive}
                                      onChange={(e) => setNewProfileFolderDrive(e.target.value)}
                                      placeholder="Ví dụ: Postgres Backup"
                                      disabled={!newProfileUploadToDrive}
                                      className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                          <DialogFooter className="gap-2 sm:gap-0">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsProfileDialogOpen(false)}
                              className="border-gray-200 hover:bg-gray-50 text-gray-700"
                            >
                              Hủy
                            </Button>
                            <Button 
                              onClick={handleCreateProfile} 
                              disabled={isCreatingProfile || !newProfileName.trim() || !newProfileDbUser.trim() || !newProfileContainerName.trim() || !newProfileDbName.trim()}
                              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm"
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
                    
                    {/* Profile list */}
                    <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-sm">
                      {profiles.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center mb-3">
                            <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chưa có profile nào</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Hãy tạo profile đầu tiên của bạn</p>
                          <Button 
                            size="sm"
                            onClick={() => setIsProfileDialogOpen(true)}
                            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Tạo profile mới
                          </Button>
                        </div>
                      ) : (
                        profiles.map((profile, index) => (
                          <div 
                            key={profile.id} 
                            className={`relative transition-all cursor-pointer ${
                              index !== 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                            } ${
                              selectedProfileId === profile.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`} 
                            onClick={() => handleProfileChange(profile.id)}
                          >
                            {profile.is_active && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                            )}
                            
                            {editingProfile === profile.id ? (
                              <div className="p-4 space-y-4 animate-in fade-in-50 zoom-in-95 duration-200">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-name-${profile.id}`} className="text-sm font-medium">Tên profile</Label>
                                  <Input 
                                    id={`edit-name-${profile.id}`}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Tên profile"
                                    className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
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
                                    className="border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={cancelEditing}
                                    className="h-8 border-gray-200"
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Hủy
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleUpdateProfile(profile.id)}
                                    className="h-8 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Lưu
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium flex items-center text-gray-900 dark:text-gray-100 mb-1">
                                      {profile.name}
                                      {profile.is_active && (
                                        <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                      {profile.description || 'Không có mô tả'}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                        {profile.db_name}
                                      </span>
                                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                        {profile.container_name}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 ml-4">
                                    {!profile.is_active && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 border-green-200 bg-green-50/50 text-green-700 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleActivateProfile(profile.id);
                                        }}
                                        title="Kích hoạt profile này"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(profile);
                                      }}
                                      title="Sửa profile"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-8 border-red-200 bg-red-50/50 text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProfile(profile.id);
                                      }}
                                      title="Xóa profile"
                                      disabled={profile.is_active}
                                    >
                                      <Trash2 className="h-3 w-3" />
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
          <div className="lg:w-2/3">
            <Card className="overflow-hidden border-gray-100 dark:border-gray-800 shadow-md flex flex-col h-full">
              <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/50 dark:to-indigo-950/40 border-b border-blue-100/80 dark:border-blue-800/20 p-5">
                <CardTitle className="flex items-center text-blue-800 dark:text-blue-300">
                  <Database className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Cấu hình hệ thống
                </CardTitle>
                <CardDescription>
                  Quản lý các thiết lập của hệ thống PostgreSQL Backup Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleSave} className="space-y-6">
                  <Tabs 
                    defaultValue={configGroups.length > 0 ? configGroups[0].group : "backup"}
                    className="flex flex-col"
                  >
                    <TabsList className="mb-6 self-start p-1 bg-gray-100/80 dark:bg-gray-800/50">
                      {configGroups.map(group => (
                        <TabsTrigger 
                          key={group.group} 
                          value={group.group}
                          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm"
                        >
                          {group.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {configGroups.map(group => (
                      <TabsContent 
                        key={group.group} 
                        value={group.group} 
                        className="space-y-5 animate-in fade-in-50 duration-200"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {group.configs.map(config => (
                            <div key={config.key} className="space-y-2">
                              <Label 
                                htmlFor={config.key} 
                                className="text-sm font-medium flex items-center gap-1"
                              >
                                {config.label}
                                {config.key === 'JWT_SECRET' && (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                                    Readonly
                                  </span>
                                )}
                              </Label>
                              <div className={`${config.type === 'switch' ? '' : 'relative'}`}>
                                {renderFormItem(config)}
                                
                                {config.type === 'password' && config.key !== 'JWT_SECRET' && (
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <div className="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-600"></div>
                                  </div>
                                )}
                              </div>
                              {config.type === 'switch' && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {formValues[config.key] === 'true' ? 'Đang bật' : 'Đang tắt'}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                  
                  <div className="flex gap-3 pt-3 justify-end border-t border-gray-100 dark:border-gray-800">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={fetchConfiguration}
                      className="border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tải lại
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-sm"
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