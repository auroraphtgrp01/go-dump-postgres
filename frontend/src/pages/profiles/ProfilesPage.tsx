import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isAuthenticated } from '@/utils/auth';
import Toast from '@/components/Toast';
import { 
  Users, 
  Trash2, 
  Check, 
  X, 
  Plus, 
  AlertCircle,
  RefreshCw,
  Pencil,
  Save
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  is_active: boolean;
}

const ProfilesPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const navigate = useNavigate();

  // Kiểm tra trạng thái xác thực khi tải trang
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth/login');
      return;
    }

    fetchProfiles();
  }, [navigate]);

  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
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
        } else {
          Toast.error(data.message || 'Không thể tải danh sách profile');
        }
      } else {
        Toast.error('Không thể tải danh sách profile');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    setIsCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: newProfileName
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Tạo profile thành công');
          setNewProfileName('');
          fetchProfiles(); // Làm mới danh sách
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
      setIsCreating(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa profile này không?')) {
      return;
    }

    setIsLoading(true);
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
          fetchProfiles(); // Làm mới danh sách
        } else {
          Toast.error(data.message || 'Không thể xóa profile');
        }
      } else {
        Toast.error('Không thể xóa profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          is_active: !currentStatus
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success(`Profile đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'}`);
          fetchProfiles(); // Làm mới danh sách
        } else {
          Toast.error(data.message || 'Không thể cập nhật trạng thái');
        }
      } else {
        Toast.error('Không thể cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error toggling profile status:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (profile: Profile) => {
    setEditingProfile(profile.id);
    setEditName(profile.name);
  };

  const cancelEditing = () => {
    setEditingProfile(null);
    setEditName('');
  };

  const handleUpdateProfile = async (id: string) => {
    if (!editName.trim()) {
      cancelEditing();
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: editName
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success('Cập nhật profile thành công');
          setEditingProfile(null);
          fetchProfiles(); // Làm mới danh sách
        } else {
          Toast.error(data.message || 'Không thể cập nhật profile');
        }
      } else {
        Toast.error('Không thể cập nhật profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center">
        <Users className="w-6 h-6 mr-2 text-primary" />
        <h1 className="text-2xl font-bold">Quản lý Profiles</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form tạo profile mới */}
        <Card className="shadow-md md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2 text-primary" />
              Tạo Profile Mới
            </CardTitle>
            <CardDescription>
              Tạo profile mới để lưu trữ cấu hình cho ứng dụng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Tên profile</Label>
                <Input
                  id="profileName"
                  placeholder="Nhập tên profile"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-background border-t-transparent rounded-full"></div>
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Tạo Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danh sách profiles */}
        <Card className="shadow-md md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Danh sách Profiles
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchProfiles}
                disabled={isLoadingProfiles}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingProfiles ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
            <CardDescription>
              Quản lý các profile đã tạo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProfiles ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Đang tải profiles...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-lg font-medium mb-1">Chưa có profile nào</p>
                <p className="text-muted-foreground">Hãy tạo profile mới để bắt đầu</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map(profile => (
                  <div 
                    key={profile.id} 
                    className={`border rounded-lg p-4 transition-all ${
                      profile.is_active ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingProfile === profile.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="max-w-xs"
                            />
                            <Button 
                              size="sm" 
                              onClick={() => handleUpdateProfile(profile.id)}
                              disabled={isLoading}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={cancelEditing}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className={`font-medium ${profile.is_active ? 'text-green-800 dark:text-green-400' : ''}`}>
                              {profile.name}
                            </span>
                            {profile.is_active && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                                Đang sử dụng
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {editingProfile !== profile.id && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => startEditing(profile)}
                            disabled={isLoading}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant={profile.is_active ? "destructive" : "default"}
                            onClick={() => handleToggleActive(profile.id, profile.is_active)}
                            disabled={isLoading}
                          >
                            {profile.is_active ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDeleteProfile(profile.id)}
                            disabled={isLoading || profile.is_active}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilesPage; 