import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated, syncAuthState } from "@/utils/auth";
import Toast from "@/components/Toast";
import { IOperationResult, IBackupFile } from "@/types";
import { formatFileSize } from "@/utils/helpers";
import {
  Database,
  CloudUpload,
  RefreshCw,
  Trash2,
  Download,
  ExternalLink,
  FileArchive,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RotateCw,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Interface cho Profile
interface Profile {
  id: string;
  name: string;
  is_active: boolean;
}

const HomePage = () => {
  const [needAuth, setNeedAuth] = useState(true);
  const [backupFiles, setBackupFiles] = useState<IBackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastOperation, setLastOperation] = useState<IOperationResult | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  // Thêm state cho profiles và selected ID
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra xác thực và tải danh sách backup + profiles
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        navigate('/auth/login');
        return;
      }

      setIsLoading(true);
      const isAuth = await syncAuthState();
      setNeedAuth(!isAuth);

      // Tải danh sách backup và profiles
      fetchBackupFiles();
      fetchProfiles();
    };

    checkAuth();

    // Kiểm tra thông báo từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const message = urlParams.get('message');

    if (success !== null && message) {
      setLastOperation({
        success: success === 'true',
        message: decodeURIComponent(message)
      });

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  // Thêm hàm fetchProfiles
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
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
          const fetchedProfiles = data.profiles || [];
          setProfiles(fetchedProfiles);

          // Tìm profile active và set làm mặc định, nếu không có thì chọn cái đầu tiên
          const activeProfile = fetchedProfiles.find((p: Profile) => p.is_active);
          if (activeProfile) {
            setSelectedProfileId(activeProfile.id);
          } else if (fetchedProfiles.length > 0) {
            setSelectedProfileId(fetchedProfiles[0].id);
          }
        } else {
          Toast.error(data.message || 'Không thể tải danh sách profile');
        }
      } else {
        Toast.error('Không thể tải danh sách profile');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      Toast.error('Lỗi kết nối máy chủ khi tải profiles');
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Tải danh sách backup files
  const fetchBackupFiles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/backups', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        if (data.success) {
          // Kiểm tra cả hai trường data.backups và data.files để xử lý cả hai định dạng API
          const backups = data.backups || data.files || [];
          console.log('Setting backup files:', backups);
          setBackupFiles(backups);
        } else {
          Toast.error(data.message || 'Không thể tải danh sách backup');
        }
      } else {
        Toast.error('Không thể tải danh sách backup');
      }
    } catch (error) {
      console.error('Error fetching backup files:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật Tạo backup mới để dùng profile_id
  const handleCreateBackup = async () => {
    if (!selectedProfileId) {
      Toast.error('Vui lòng chọn profile database để tạo backup.');
      return;
    }

    setIsCreatingBackup(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/dump?profile_id=${selectedProfileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      if (data.success) {
        Toast.success('Tạo backup thành công');
        fetchBackupFiles(); // Làm mới danh sách
      } else {
        Toast.error(data.message || 'Không thể tạo backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Upload backup lên Google Drive
  const handleUploadToDrive = async (id: string) => {
    if (needAuth) {
      navigate('/google-auth');
      return;
    }

    setIsUploading(id);
    // Hiển thị thông báo đang bắt đầu upload
    Toast.info(`Đang upload file lên Google Drive...`);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/upload/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      const data = await response.json();
      if (data.success) {
        Toast.success('Upload lên Google Drive thành công');
        fetchBackupFiles(); // Làm mới danh sách
      } else {
        Toast.error(data.message || 'Không thể upload lên Google Drive');
      }
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsUploading(null);
    }
  };

  // Xóa backup
  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa backup này không?')) {
      return;
    }

    setIsDeleting(id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/backups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      const data = await response.json();
      if (data.success) {
        Toast.success('Xóa backup thành công');
        fetchBackupFiles(); // Làm mới danh sách
      } else {
        Toast.error(data.message || 'Không thể xóa backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-3">
          <Database className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">PostgreSQL Backup Manager</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Hệ thống quản lý sao lưu và đồng bộ dữ liệu PostgreSQL với Google Drive
        </p>
      </div>

      {/* Alert nếu cần xác thực Google */}
      {needAuth && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">Xác thực Google Drive cần thiết</h3>
            <p className="text-sm mt-1">
              Bạn cần xác thực với Google Drive để có thể lưu trữ các bản sao lưu trên đám mây.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-white dark:bg-transparent"
              onClick={() => navigate('/google-auth')}
            >
              Xác thực ngay
            </Button>
          </div>
        </div>
      )}

      {/* Thông báo kết quả thao tác */}
      {lastOperation && (
        <div className={`mb-6 ${lastOperation.success
          ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
          : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
          } px-4 py-3 rounded-lg flex items-start border`}>
          {lastOperation.success ? (
            <CheckCircle2 className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <h3 className="font-medium">
              {lastOperation.success ? 'Thành công' : 'Thất bại'}
            </h3>
            <p className="text-sm mt-1">{lastOperation.message}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Actions */}
        <div className="lg:col-span-1">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Plus className="h-5 w-5 mr-2 text-primary" />
                Thao tác
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileSelect">Chọn Profile Database</Label>
                <Select
                  value={selectedProfileId || undefined}
                  onValueChange={setSelectedProfileId}
                  disabled={loadingProfiles}
                >
                  <SelectTrigger id="profileSelect" className="w-full">
                    <SelectValue placeholder={loadingProfiles ? "Đang tải..." : "Chọn profile"} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.length === 0 && !loadingProfiles && (
                      <SelectItem value="no-profiles" disabled>Chưa có profile nào</SelectItem>
                    )}
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name} {profile.is_active ? "(Đang hoạt động)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full justify-start"
                variant={'outline'}
                onClick={handleCreateBackup}
                disabled={isCreatingBackup || !selectedProfileId || loadingProfiles}
              >
                {isCreatingBackup ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo backup mới
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main content - Backup files list */}
        <div className="lg:col-span-3">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between px-6">
              <CardTitle className="text-lg flex items-center">
                <FileArchive className="h-5 w-5 mr-2 text-primary" />
                Danh sách Backup
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBackupFiles}
                disabled={isLoading}
                className="h-8"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Đang tải danh sách backup...</p>
                </div>
              ) : backupFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileArchive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Chưa có backup nào</h3>
                  <p className="text-muted-foreground mb-4">
                    Tạo backup PostgreSQL đầu tiên của bạn ngay bây giờ
                  </p>
                  <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
                    {isCreatingBackup ? 'Đang tạo...' : 'Tạo backup mới'}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium">Tên file</th>
                        <th className="text-left py-3 px-4 font-medium">Thời gian</th>
                        <th className="text-left py-3 px-4 font-medium">Kích thước</th>
                        <th className="text-left py-3 px-4 font-medium">Trạng thái</th>
                        <th className="text-right py-3 px-4 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupFiles.map((file) => (
                        <tr
                          key={file.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                          onClick={(e) => e.preventDefault()}
                        >
                          <td className="py-3 px-4 text-left">
                            <div className="flex items-center">
                              <FileArchive className="h-4 w-4 mr-2 text-primary" />
                              <span className="font-medium">{file.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-left text-muted-foreground">
                            {new Date(file.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-left text-muted-foreground">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="py-3 px-4 text-left">
                            {file.uploaded ? (
                              <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Đã upload
                              </div>
                            ) : isUploading === file.id ? (
                              <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs">
                                <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                                Đang upload...
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Chưa upload
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {file.uploaded && file.driveLink && (
                                <a
                                  href={file.driveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Xem trên Google Drive"
                                  className="flex items-center justify-center h-8 w-8 p-0 rounded-md hover:bg-muted"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Tải xuống"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Xử lý tải xuống tại đây nếu cần
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {!file.uploaded && (
                                <Button
                                  variant={isUploading === file.id ? "outline" : "ghost"}
                                  size="sm"
                                  className={`h-8 ${isUploading === file.id ? 'w-auto px-2' : 'w-8 p-0'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUploadToDrive(file.id);
                                  }}
                                  disabled={isUploading !== null || needAuth}
                                  title="Upload lên Google Drive"
                                >
                                  {isUploading === file.id ? (
                                    <>
                                      <RotateCw className="h-4 w-4 mr-1 animate-spin" />
                                      <span className="text-xs">Uploading...</span>
                                    </>
                                  ) : (
                                    <CloudUpload className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBackup(file.id);
                                }}
                                disabled={isDeleting === file.id}
                                title="Xóa"
                              >
                                {isDeleting === file.id ? (
                                  <RotateCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 