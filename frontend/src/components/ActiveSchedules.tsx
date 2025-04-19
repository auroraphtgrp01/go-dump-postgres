import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IActiveJob, IJobLog } from '@/types';
import { 
  RefreshCw, Calendar, PlayCircle, PauseCircle, 
  Trash2, CheckSquare, XSquare, TimerOff, BarChart4,
  History
} from 'lucide-react';
import Toast from '@/components/Toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

const ActiveSchedules = () => {
  const [activeJobs, setActiveJobs] = useState<IActiveJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IActiveJob | null>(null);
  const [jobLogs, setJobLogs] = useState<IJobLog[]>([]);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch danh sách công việc đang chạy
  const fetchActiveJobs = async () => {
    setIsRefreshing(true);
    try {                                                      
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/schedule/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActiveJobs(data.jobs || []);
        } else {
          Toast.error(data.message || 'Không thể tải danh sách công việc');
        }
      } else {
        Toast.error('Không thể tải danh sách công việc');
      }
    } catch (error) {
      console.error('Error fetching active jobs:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch dữ liệu khi component được tải
  useEffect(() => {
    fetchActiveJobs();

    // Tự động cập nhật mỗi 60 giây
    const intervalId = setInterval(fetchActiveJobs, 60000);
    
    // Lắng nghe sự kiện làm mới từ component khác
    const handleRefresh = () => {
      fetchActiveJobs();
    };
    
    document.addEventListener('refresh-schedules', handleRefresh);

    // Dọn dẹp interval và event listener khi component unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('refresh-schedules', handleRefresh);
    };
  }, []);

  // Xử lý chạy backup ngay lập tức
  const handleRunNow = async (profileId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/schedule/run-now', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profile_id: parseInt(profileId) })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success(data.message || 'Đã bắt đầu thực hiện backup');
        } else {
          Toast.error(data.message || 'Không thể thực hiện backup');
        }
      } else {
        Toast.error('Không thể thực hiện backup');
      }
    } catch (error) {
      console.error('Error running backup:', error);
      Toast.error('Lỗi kết nối máy chủ');
    }
  };

  // Xử lý tạm dừng/tiếp tục job
  const handleTogglePause = async (job: IActiveJob) => {
    const isPaused = job.status === 'paused';
    const endpoint = isPaused ? '/api/schedule/resume' : '/api/schedule/pause';

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profile_id: parseInt(job.profile_id) })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success(data.message || `Đã ${isPaused ? 'tiếp tục' : 'tạm dừng'} lịch backup`);
          fetchActiveJobs(); // Cập nhật lại danh sách
        } else {
          Toast.error(data.message || `Không thể ${isPaused ? 'tiếp tục' : 'tạm dừng'} lịch backup`);
        }
      } else {
        Toast.error(`Không thể ${isPaused ? 'tiếp tục' : 'tạm dừng'} lịch backup`);
      }
    } catch (error) {
      console.error(`Error ${isPaused ? 'resuming' : 'pausing'} job:`, error);
      Toast.error('Lỗi kết nối máy chủ');
    }
  };

  // Xử lý xóa lịch
  const handleDeleteSchedule = async (profileId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch backup này?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/schedule/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profile_id: parseInt(profileId) })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Toast.success(data.message || 'Đã xóa lịch backup');
          fetchActiveJobs(); // Cập nhật lại danh sách
        } else {
          Toast.error(data.message || 'Không thể xóa lịch backup');
        }
      } else {
        Toast.error('Không thể xóa lịch backup');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      Toast.error('Lỗi kết nối máy chủ');
    }
  };

  // Xử lý xem lịch sử job
  const handleViewLogs = async (job: IActiveJob) => {
    setSelectedJob(job);
    setIsLogDialogOpen(true);
    setIsLoadingLogs(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/schedule/logs/${job.profile_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setJobLogs(data.logs || []);
        } else {
          Toast.error(data.message || 'Không thể tải lịch sử');
        }
      } else {
        Toast.error('Không thể tải lịch sử');
      }
    } catch (error) {
      console.error('Error fetching job logs:', error);
      Toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Hiển thị trạng thái job
  const renderStatus = (job: IActiveJob) => {
    switch (job.status) {
      case 'running':
        return (
          <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500"></span>
            Đang chạy
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-gray-500"></span>
            {job.status}
          </span>
        );
    }
  };

  // Render giao diện
  return (
    <Card className="shadow-md border-gray-100 dark:border-gray-800">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart4 className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <CardTitle className="text-gray-800 dark:text-gray-100">Lịch trình backup đang chạy</CardTitle>
              <CardDescription>Danh sách và trạng thái các lịch backup đã thiết lập</CardDescription>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchActiveJobs} 
            disabled={isRefreshing}
            className="h-8 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Đang tải dữ liệu...</span>
          </div>
        ) : activeJobs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Lịch trình</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lần chạy</TableHead>
                <TableHead>Chạy tiếp theo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeJobs.map((job) => (
                <TableRow key={job.profile_id}>
                  <TableCell className="font-medium">{job.profile_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      {job.schedule}
                    </div>
                  </TableCell>
                  <TableCell>{renderStatus(job)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <CheckSquare size={14} className="mr-1" />
                        <span>{job.success_count}</span>
                      </div>
                      <div className="flex items-center text-red-600 dark:text-red-400">
                        <XSquare size={14} className="mr-1" />
                        <span>{job.failed_count}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{job.next_run}</span>
                      <span className="text-xs text-gray-500">Còn {job.duration}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 border-green-200 bg-green-50/50 text-green-700 hover:bg-green-50 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                        onClick={() => handleRunNow(job.profile_id)}
                        title="Chạy ngay"
                      >
                        <PlayCircle size={16} />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={job.status === 'paused' 
                          ? "h-8 px-2 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          : "h-8 px-2 border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                        }
                        onClick={() => handleTogglePause(job)}
                        title={job.status === 'paused' ? "Tiếp tục" : "Tạm dừng"}
                      >
                        {job.status === 'paused' 
                          ? <PlayCircle size={16} /> 
                          : <PauseCircle size={16} />
                        }
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-50 dark:border-purple-900/30 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                        onClick={() => handleViewLogs(job)}
                        title="Xem lịch sử"
                      >
                        <History size={16} />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 border-red-200 bg-red-50/50 text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                        onClick={() => handleDeleteSchedule(job.profile_id)}
                        title="Xóa lịch"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <TimerOff className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium mb-1">Chưa có lịch backup nào được cấu hình</p>
            <p className="text-sm">Hãy tạo lịch backup mới bằng nút "Tạo lịch mới" phía trên</p>
          </div>
        )}
      </CardContent>

      {/* Dialog hiển thị lịch sử job */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <History className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Lịch sử backup cho {selectedJob?.profile_name}
            </DialogTitle>
            <DialogDescription>
              Danh sách các lần backup đã thực hiện gần đây
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingLogs ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Đang tải dữ liệu...</span>
            </div>
          ) : jobLogs.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Thông tin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(log.start_time), 'dd/MM/yyyy HH:mm:ss')}
                          </span>
                          {log.end_time && (
                            <span className="text-xs text-gray-500">
                              {format(new Date(log.end_time), 'dd/MM/yyyy HH:mm:ss')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckSquare className="h-3.5 w-3.5 mr-1" />
                            Thành công
                          </span>
                        ) : log.status === 'failed' ? (
                          <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            <XSquare className="h-3.5 w-3.5 mr-1" />
                            Thất bại
                          </span>
                        ) : log.status === 'running' ? (
                          <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                            Đang chạy
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                            {log.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status === 'manual' ? 'Thủ công' : 'Tự động'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate">
                          {log.message || (log.backup_file ? `File: ${log.backup_file}` : '-')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>Chưa có lịch sử backup nào</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setIsLogDialogOpen(false)}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ActiveSchedules;