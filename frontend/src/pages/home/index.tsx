import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthenticated, syncAuthState } from "@/utils/auth";
import Toast from "@/components/Toast";
import { IOperationResult, IBackupFile, IProfile } from "@/types";
import { formatFileSize } from "@/utils/helpers";
import {
  Database,
  RefreshCw,
  Trash2,
  ExternalLink,
  FileArchive,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Calendar,
  Clock,
  Filter,
  Loader2,
  HardDrive,
  Shield,
  ArrowDownToLine,
  Upload,
  Archive,
  Info,
  BarChart2,
  LayoutGrid,
  TableProperties,
  AlarmClock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackupService } from "@/lib/http/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ScheduleSelector from "@/components/ScheduleSelector";
import ActiveSchedules from "@/components/ActiveSchedules";

// Transition animation classes
const FADE_IN_ANIMATION = "animate-in fade-in duration-300";
const SLIDE_IN_ANIMATION = "animate-in slide-in-from-bottom-5 duration-300";

const HomePage = () => {
  // State management
  const [needAuth, setNeedAuth] = useState(true);
  const [backupFiles, setBackupFiles] = useState<IBackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastOperation, setLastOperation] = useState<IOperationResult | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<IProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [statsVisible, setStatsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  
  // Thêm state cho dialog lịch trình
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleCron, setNewScheduleCron] = useState('0 0 * * *');
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  
  const navigate = useNavigate();

  // Initialize component - auth check and data loading
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        navigate('/auth/login');
        return;
      }

      setIsLoading(true);
      const isAuth = await syncAuthState();
      setNeedAuth(!isAuth);

      // Load backup files and profiles
      fetchBackupFiles();
      fetchProfiles();
    };

    checkAuth();

    // Check for notifications from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const message = urlParams.get('message');

    if (success !== null && message) {
      setLastOperation({
        success: success === 'true',
        message: decodeURIComponent(message)
      });

      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  // Fetch profiles from API
  const fetchProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/profiles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const fetchedProfiles = data.profiles || [];
          setProfiles(fetchedProfiles);

          // Set active profile as default, or first profile if none active
          const activeProfile = fetchedProfiles.find((p: IProfile) => p.is_active);
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

  // Fetch backup files from API
  const fetchBackupFiles = async () => {
    try {
      setIsSyncing(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/backups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Handle both API response formats
          const backups = data.backups || data.files || [];
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
      setIsSyncing(false);
    }
  };

  // Create new backup
  const handleCreateBackup = async () => {
    if (!selectedProfileId) {
      Toast.error('Vui lòng chọn profile database để tạo backup.');
      return;
    }

    setIsCreatingBackup(true);
    Toast.info('Đang tạo backup...');
    
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
        fetchBackupFiles(); // Refresh list
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

  // Upload backup to Google Drive
  const handleUploadToDrive = async (id: string) => {
    if (needAuth) {
      navigate('/google-auth');
      return;
    }

    setIsUploading(id);
    Toast.info(`Đang upload file lên Google Drive...`);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/upload/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        Toast.success('Upload lên Google Drive thành công');
        fetchBackupFiles(); // Refresh list
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

  // Delete backup
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
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        Toast.success('Xóa backup thành công');
        fetchBackupFiles(); // Refresh list
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

  // Filter backups based on active tab and search term
  const filteredBackups = backupFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "uploaded") return file.uploaded && matchesSearch;
    if (activeTab === "pending") return !file.uploaded && matchesSearch;
    
    return matchesSearch;
  });

  // Statistics calculations
  const totalBackups = backupFiles.length;
  const uploadedBackups = backupFiles.filter(f => f.uploaded).length;
  const pendingBackups = totalBackups - uploadedBackups;
  const totalSize = backupFiles.reduce((acc, file) => acc + file.size, 0);

  // Group backups by date for better organization
  const getBackupDate = (file: IBackupFile) => {
    const date = new Date(file.createdAt);
    return date.toISOString().split('T')[0];
  };

  const groupedBackups = filteredBackups.reduce((groups, file) => {
    const date = getBackupDate(file);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(file);
    return groups;
  }, {} as Record<string, IBackupFile[]>);

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedBackups).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Thêm hàm tạo lịch mới từ ConfigPage
  const handleCreateSchedule = async () => {
    if (!newScheduleName.trim()) {
      Toast.error('Vui lòng nhập tên lịch');
      return;
    }

    if (!selectedProfileId) {
      Toast.error('Vui lòng chọn một profile trước khi tạo lịch');
      return;
    }

    setIsCreatingSchedule(true);
    try {
      const token = localStorage.getItem('auth_token');

      const requestData = {
        profile_id: selectedProfileId,
        cron_schedule: newScheduleCron
      };

      const response = await fetch('/api/schedule/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        Toast.success('Tạo lịch mới thành công');
        setNewScheduleName('');
        setNewScheduleCron('0 0 * * *');
        setIsScheduleDialogOpen(false);
        // Làm mới danh sách lịch
        document.dispatchEvent(new CustomEvent('refresh-schedules'));
      } else {
        Toast.error(data.message || 'Không thể tạo lịch');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      {/* Header with refined design */}
      <div className="relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 shadow-md border border-blue-100/80 dark:border-blue-900/20">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/3 translate-x-1/3 rounded-full bg-blue-200/40 dark:bg-blue-400/10 blur-2xl"></div>
        <div className="absolute left-1/4 bottom-0 h-24 w-24 translate-y-1/3 rounded-full bg-indigo-300/30 dark:bg-indigo-500/10 blur-2xl"></div>
        
        <div className="relative z-10 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 shadow-md shadow-blue-500/20 dark:shadow-blue-900/30">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  PostgreSQL Backup Manager
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg">
                Hệ thống quản lý sao lưu và đồng bộ dữ liệu PostgreSQL với Google Drive
              </p>
            </div>

            <div className="flex flex-wrap gap-3 md:justify-end">
              {needAuth && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  onClick={() => navigate('/google-auth')}
                >
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  Xác thực Google Drive
                </Button>
              )}
              
              {/* Thêm nút lịch trình */}
              <Button
                size="sm"
                variant="outline"
                className="border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800/50 dark:bg-indigo-900/10 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                onClick={() => {
                  if (!selectedProfileId) {
                    Toast.warning('Vui lòng chọn một profile trước khi tạo lịch');
                    return;
                  }
                  setIsScheduleDialogOpen(true);
                }}
              >
                <AlarmClock className="mr-1.5 h-3.5 w-3.5" />
                Quản lý lịch trình
              </Button>
              
              <div className="flex gap-2">
                <Select
                  value={selectedProfileId || undefined}
                  onValueChange={setSelectedProfileId}
                  disabled={loadingProfiles}
                >
                  <SelectTrigger 
                    className="h-9 w-[180px] border-blue-200 bg-white/90 text-sm dark:border-blue-800/50 dark:bg-blue-950/30"
                  >
                    <SelectValue placeholder={
                      loadingProfiles 
                        ? "Đang tải..." 
                        : profiles.length === 0 
                          ? "Chưa có profile" 
                          : "Chọn profile"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.length === 0 && !loadingProfiles && (
                      <SelectItem value="no-profiles" disabled>Chưa có profile nào</SelectItem>
                    )}
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center">
                          <span>{profile.name}</span>
                          {profile.is_active && (
                            <Badge className="ml-2 h-4 px-1 py-0 text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  size="sm"
                  className="h-9 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup || !selectedProfileId || loadingProfiles}
                >
                  {isCreatingBackup ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      <span>Tạo backup</span>
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-blue-200 bg-white/80 text-blue-700 hover:bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  onClick={fetchBackupFiles}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog lịch trình */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => {
        setIsScheduleDialogOpen(open);
        if (!open) {
          // Reset form khi đóng dialog
          setNewScheduleName('');
          setNewScheduleCron('0 0 * * *');
        }
      }}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <AlarmClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              Quản lý lịch backup tự động
            </DialogTitle>
            <DialogDescription>
              Thiết lập và quản lý các lịch tự động backup database PostgreSQL
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto py-6 px-1">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Form tạo lịch mới */}
                <div className="md:col-span-1 space-y-2">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900 shadow-sm">
                    <div className="relative">
                      <h3 className="text-base font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                          <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Tạo lịch backup mới
                      </h3>
                    
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="schedule-name" className="font-medium text-gray-700 dark:text-gray-300">
                            Tên lịch
                          </Label>
                          <Input
                            id="schedule-name"
                            value={newScheduleName}
                            onChange={e => setNewScheduleName(e.target.value)}
                            placeholder="Backup hàng ngày"
                            className="border-gray-200 dark:border-gray-700 mt-1"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                            Lịch trình
                          </Label>
                          <ScheduleSelector
                            value={newScheduleCron}
                            onChange={(value) => setNewScheduleCron(value)}
                          />
                        </div>
                      
                        <Button
                          onClick={handleCreateSchedule}
                          disabled={isCreatingSchedule || !newScheduleName.trim() || !selectedProfileId}
                          className={`w-full mt-2 ${!newScheduleName.trim() || !selectedProfileId ? 'opacity-50 cursor-not-allowed' : ''} 
                          bg-indigo-600 hover:bg-indigo-700 text-white`}
                        >
                          {isCreatingSchedule ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang tạo...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Thêm lịch trình
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              
                {/* Danh sách lịch trình */}
                <div className="md:col-span-2 space-y-2">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900 shadow-sm h-full relative">
                    <h3 className="text-base font-medium flex items-center gap-2 text-gray-800 dark:text-gray-300 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <AlarmClock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Lịch trình đang chạy
                    </h3>
                    <div className="max-h-[410px] overflow-y-auto pr-2 -mr-2">
                      <ActiveSchedules />
                    </div>
                    
                    {!selectedProfileId && (
                      <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center flex-col gap-2 rounded-xl z-10">
                        <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Database className="h-7 w-7 text-gray-400 dark:text-gray-500" /> 
                        </div>
                        <p className="text-center text-gray-600 dark:text-gray-400 max-w-xs">
                          Vui lòng chọn profile database trước khi tạo lịch trình backup
                        </p>
                        <Button
                          variant="outline" 
                          size="sm"
                          className="mt-2 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-400"
                          onClick={() => setIsScheduleDialogOpen(false)}
                        >
                          Đóng và chọn profile
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsScheduleDialogOpen(false);
                setIsCreatingSchedule(false);
                setNewScheduleName('');
                setNewScheduleCron('0 0 * * *');
              }}
              className="border-gray-200 dark:border-gray-700"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operation result notification */}
      {lastOperation && (
        <div 
          className={`${SLIDE_IN_ANIMATION} mb-6 rounded-xl border px-5 py-4 flex items-start gap-3 shadow-sm ${
            lastOperation.success
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300'
          }`}
        >
          {lastOperation.success ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          )}
          <div>
            <h3 className="font-medium">
              {lastOperation.success ? 'Thao tác thành công' : 'Thao tác thất bại'}
            </h3>
            <p className="mt-1 text-sm opacity-90">{lastOperation.message}</p>
          </div>
        </div>
      )}

      {/* Statistics cards */}
      {statsVisible && backupFiles.length > 0 && (
        <div className={`${FADE_IN_ANIMATION} grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4`}>
          <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 shadow-md dark:border-indigo-900/30 dark:from-gray-900 dark:to-indigo-900/30">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="flex w-20 items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-800">
                  <Archive className="h-8 w-8 text-white" />
                </div>
                <div className="flex flex-1 flex-col justify-center p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Tổng số backup</p>
                  <div className="mt-1 flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalBackups}</h3>
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">file</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-green-100 bg-gradient-to-br from-white to-green-50/50 shadow-md dark:border-green-900/30 dark:from-gray-900 dark:to-green-900/30">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="flex w-20 items-center justify-center bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-800">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <div className="flex flex-1 flex-col justify-center p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Đã upload</p>
                  <div className="mt-1 flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{uploadedBackups}</h3>
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">file</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-amber-100 bg-gradient-to-br from-white to-amber-50/50 shadow-md dark:border-amber-900/30 dark:from-gray-900 dark:to-amber-900/30">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="flex w-20 items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-800">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
                <div className="flex flex-1 flex-col justify-center p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">Chưa upload</p>
                  <div className="mt-1 flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{pendingBackups}</h3>
                    <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">file</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/50 shadow-md dark:border-blue-900/30 dark:from-gray-900 dark:to-blue-900/30">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="flex w-20 items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-800">
                  <HardDrive className="h-8 w-8 text-white" />
                </div>
                <div className="flex flex-1 flex-col justify-center p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">Tổng dung lượng</p>
                  <div className="mt-1 flex items-baseline">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(totalSize)}</h3>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main content */}
      <Card className="border-gray-200/80 bg-white/90 backdrop-blur-sm shadow-lg dark:border-gray-800/50 dark:bg-gray-900/50 overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800/70 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <FileArchive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="ml-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Danh sách Backup
              </CardTitle>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <Input 
                  placeholder="Tìm kiếm backup..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 w-full border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50"
                />
              </div>
              
              <div className="flex items-center rounded-md border border-gray-200 p-1 dark:border-gray-700">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-7 w-7 rounded-sm",
                          viewMode === "table" 
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" 
                            : "text-gray-500 dark:text-gray-400"
                        )}
                        onClick={() => setViewMode("table")}
                      >
                        <TableProperties className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      <p className="text-xs">Xem dạng bảng</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-7 w-7 rounded-sm",
                          viewMode === "grid" 
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" 
                            : "text-gray-500 dark:text-gray-400"
                        )}
                        onClick={() => setViewMode("grid")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="center">
                      <p className="text-xs">Xem dạng lưới</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={cn(
                        "h-9 w-9 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50",
                        statsVisible 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-gray-500 dark:text-gray-400"
                      )}
                      onClick={() => setStatsVisible(!statsVisible)}
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{statsVisible ? "Ẩn thống kê" : "Hiện thống kê"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="mt-5"
          >
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="all" className="text-sm">
                Tất cả ({backupFiles.length})
              </TabsTrigger>
              <TabsTrigger value="uploaded" className="text-sm">
                Đã upload ({uploadedBackups})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-sm">
                Chưa upload ({pendingBackups})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
              <p className="text-gray-500 dark:text-gray-400">Đang tải danh sách backup...</p>
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className="py-16 text-center">
              {searchTerm ? (
                <>
                  <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">Không tìm thấy kết quả</h3>
                  <p className="mx-auto mb-4 max-w-md text-gray-500 dark:text-gray-400">
                    Không tìm thấy backup nào khớp với từ khóa "{searchTerm}"
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm("")}
                    className="bg-white dark:bg-gray-800"
                  >
                    Xóa tìm kiếm
                  </Button>
                </>
              ) : backupFiles.length === 0 ? (
                <>
                  <FileArchive className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">Chưa có backup nào</h3>
                  <p className="mx-auto mb-4 max-w-md text-gray-500 dark:text-gray-400">
                    Tạo backup PostgreSQL đầu tiên của bạn
                  </p>
                  <Button 
                    onClick={handleCreateBackup} 
                    disabled={isCreatingBackup}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                  >
                    {isCreatingBackup ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Tạo backup mới
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Filter className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">Không có backup nào trong trạng thái này</h3>
                  <p className="mx-auto mb-4 max-w-md text-gray-500 dark:text-gray-400">
                    Chọn một tab khác để xem các backup
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("all")}
                    className="bg-white dark:bg-gray-800"
                  >
                    Xem tất cả backup
                  </Button>
                </>
              )}
            </div>
          ) : viewMode === "table" ? (
            // Table view with ScrollArea
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-gray-100 dark:divide-gray-800/70">
                {sortedDates.map((date) => (
                  <div key={date} className="bg-white dark:bg-transparent">
                    <div className="flex items-center gap-2 bg-gray-50 px-6 py-3 dark:bg-gray-800/30">
                      <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(date)}
                      </span>
                      <Badge variant="outline" className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {groupedBackups[date].length} file
                      </Badge>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <tbody>
                          {groupedBackups[date].map((file) => (
                            <tr
                              key={file.id}
                              className="border-b border-gray-100 dark:border-gray-800/30 transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                            >
                              <td className="py-3 px-4 md:px-6">
                                <div className="flex items-center gap-3">
                                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                    file.uploaded 
                                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                    <FileArchive className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{file.name}</div>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                      <Clock className="h-3 w-3" />
                                      {new Date(file.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="py-3 px-4 md:px-6">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {formatFileSize(file.size)}
                                </div>
                              </td>
                              
                              <td className="py-3 px-4 md:px-6">
                                {file.uploaded ? (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800/50">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Đã upload
                                  </Badge>
                                ) : isUploading === file.id ? (
                                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 animate-pulse">
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Đang upload...
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    Chưa upload
                                  </Badge>
                                )}
                              </td>
                              
                              <td className="py-3 px-4 md:px-6 text-right">
                                <div className="flex items-center justify-end space-x-1">
                                  <TooltipProvider>
                                    <DropdownMenu>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 w-8 rounded-full p-0 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                            >
                                              <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                          <p className="text-xs">Tùy chọn</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      
                                      <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem
                                          className="cursor-pointer flex items-center gap-2 text-sm"
                                          onClick={() => window.open(BackupService.downloadBackup(file.id), '_blank')}
                                        >
                                          <ArrowDownToLine className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                          <span>Tải xuống</span>
                                        </DropdownMenuItem>
                                        
                                        {file.uploaded && file.driveLink && (
                                          <DropdownMenuItem
                                            className="cursor-pointer flex items-center gap-2 text-sm"
                                            onClick={() => window.open(file.driveLink, '_blank')}
                                          >
                                            <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <span>Xem trên Google Drive</span>
                                          </DropdownMenuItem>
                                        )}
                                        
                                        {!file.uploaded && (
                                          <DropdownMenuItem
                                            className="cursor-pointer flex items-center gap-2 text-sm"
                                            onClick={() => handleUploadToDrive(file.id)}
                                            disabled={isUploading !== null || needAuth}
                                          >
                                            <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <span>Upload lên Google Drive</span>
                                          </DropdownMenuItem>
                                        )}
                                        
                                        <DropdownMenuSeparator />
                                        
                                        <DropdownMenuItem
                                          className="cursor-pointer flex items-center gap-2 text-sm text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:text-red-400"
                                          onClick={() => handleDeleteBackup(file.id)}
                                          disabled={isDeleting === file.id}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Xóa backup</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TooltipProvider>
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 rounded-full p-0 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                          onClick={() => window.open(BackupService.downloadBackup(file.id), '_blank')}
                                        >
                                          <ArrowDownToLine className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p className="text-xs">Tải xuống</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  
                                  {!file.uploaded && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 rounded-full p-0 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                            onClick={() => handleUploadToDrive(file.id)}
                                            disabled={isUploading !== null || needAuth}
                                          >
                                            {isUploading === file.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Upload className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          <p className="text-xs">Upload lên Google Drive</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 rounded-full p-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                          onClick={() => handleDeleteBackup(file.id)}
                                          disabled={isDeleting === file.id}
                                        >
                                          {isDeleting === file.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p className="text-xs">Xóa backup</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            // Grid view with ScrollArea
            <ScrollArea className="h-[600px]">
              <div className="p-4 md:p-6">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-8 last:mb-0">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(date)}
                      </h3>
                      <Badge variant="outline" className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium">
                        {groupedBackups[date].length} file
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {groupedBackups[date].map((file) => (
                        <Card key={file.id} className="overflow-hidden border-gray-200 bg-white shadow-sm hover:shadow transition-shadow dark:border-gray-800 dark:bg-gray-900">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  file.uploaded 
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  <FileArchive className="h-4 w-4" />
                                </div>
                                {file.uploaded ? (
                                  <Badge className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800/50">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Đã upload
                                  </Badge>
                                ) : isUploading === file.id ? (
                                  <Badge variant="outline" className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 animate-pulse">
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Đang upload...
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    Chưa upload
                                  </Badge>
                                )}
                              </div>
                              <div className="flex">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuItem
                                      className="cursor-pointer flex items-center gap-2 text-sm"
                                      onClick={() => window.open(BackupService.downloadBackup(file.id), '_blank')}
                                    >
                                      <ArrowDownToLine className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                      <span>Tải xuống</span>
                                    </DropdownMenuItem>
                                    
                                    {file.uploaded && file.driveLink && (
                                      <DropdownMenuItem
                                        className="cursor-pointer flex items-center gap-2 text-sm"
                                        onClick={() => window.open(file.driveLink, '_blank')}
                                      >
                                        <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <span>Xem trên Google Drive</span>
                                      </DropdownMenuItem>
                                    )}
                                    
                                    {!file.uploaded && (
                                      <DropdownMenuItem
                                        className="cursor-pointer flex items-center gap-2 text-sm"
                                        onClick={() => handleUploadToDrive(file.id)}
                                        disabled={isUploading !== null || needAuth}
                                      >
                                        <Upload className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span>Upload lên Google Drive</span>
                                      </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem
                                      className="cursor-pointer flex items-center gap-2 text-sm text-red-600 focus:text-red-700 dark:text-red-500 dark:focus:text-red-400"
                                      onClick={() => handleDeleteBackup(file.id)}
                                      disabled={isDeleting === file.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span>Xóa backup</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            <div className="px-4 py-3">
                              <div className="break-all font-medium text-gray-900 dark:text-gray-100">{file.name}</div>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  {new Date(file.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {formatFileSize(file.size)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex divide-x divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                              <Button
                                variant="ghost"
                                className="flex-1 rounded-none py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                onClick={() => window.open(BackupService.downloadBackup(file.id), '_blank')}
                              >
                                <ArrowDownToLine className="mr-1 h-3.5 w-3.5" />
                                Tải xuống
                              </Button>
                              
                              {file.uploaded && file.driveLink ? (
                                <Button
                                  variant="ghost"
                                  className="flex-1 rounded-none py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                  onClick={() => window.open(file.driveLink, '_blank')}
                                >
                                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                  Google Drive
                                </Button>
                              ) : !file.uploaded ? (
                                <Button
                                  variant="ghost"
                                  className="flex-1 rounded-none py-2 text-xs font-medium text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                  onClick={() => handleUploadToDrive(file.id)}
                                  disabled={isUploading !== null || needAuth}
                                >
                                  {isUploading === file.id ? (
                                    <>
                                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="mr-1 h-3.5 w-3.5" />
                                      Upload
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className="flex-1 rounded-none py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                  onClick={() => handleDeleteBackup(file.id)}
                                  disabled={isDeleting === file.id}
                                >
                                  {isDeleting === file.id ? (
                                    <>
                                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                      Đang xóa...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      Xóa
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;