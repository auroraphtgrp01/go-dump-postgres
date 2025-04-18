/**
 * Auth utilities for the backup application
 */
import { toast } from 'react-toastify';
import { IUser } from '../types';
import axios from 'axios';

// Toast utility wrapper
const Toast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
  loading: (message: string) => {
    const id = toast.loading(message);
    return () => toast.dismiss(id);
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');
  return !!token && !!user;
};

// Get user info from localStorage
export const getUser = (): IUser | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Fetch user info from server
export const fetchUserInfo = async (): Promise<IUser | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch('/api/me', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        // Save user info to localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching user info:", error);
    Toast.error('Không thể lấy thông tin người dùng');
    return null;
  }
};

// Kiểm tra trạng thái xác thực Google Drive
export const checkGoogleDriveAuth = async (): Promise<boolean> => {
  try {
    const response = await axios.get('/api/drive/status');
    
    // Kiểm tra trạng thái xác thực từ phản hồi API
    const isAuthenticated = response.data.drive_status?.is_authenticated || false;
    
    console.log('Trạng thái xác thực Google Drive:', isAuthenticated);
    return isAuthenticated;
  } catch (error) {
    console.error('Lỗi kiểm tra xác thực Google Drive:', error);
    return false;
  }
};

// Sync auth state
export const syncAuthState = async (): Promise<boolean> => {
  // If not logged in, no need to sync
  if (!localStorage.getItem('auth_token')) {
    return false;
  }

  // If missing user info, try to fetch from server
  if (!localStorage.getItem('user')) {
    const user = await fetchUserInfo();
    if (!user) return false;
  }

  // Kiểm tra xác thực Google Drive
  const isDriveAuthenticated = await checkGoogleDriveAuth();
  
  return isDriveAuthenticated;
};

// Logout function
export const logout = async (): Promise<void> => {
  const loadingMessage = Toast.loading('Đang đăng xuất...');
  try {
    const token = localStorage.getItem('auth_token');
    
    // Call logout API
    await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    // Hiển thị thông báo thành công
    Toast.success('Đăng xuất thành công');
    
    // Đóng thông báo loading
    loadingMessage();
    
    // Clear auth data regardless of API success
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
  } catch (error) {
    console.error('Error during logout:', error);
    Toast.error('Có lỗi xảy ra khi đăng xuất');
    
    // Đóng thông báo loading
    loadingMessage();
    
    // Clear auth data regardless of API success
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // Đợi một chút để hiển thị thông báo lỗi
    setTimeout(() => {
      // Redirect to login page
      window.location.href = '/login';
    }, 1000);
  }
}; 