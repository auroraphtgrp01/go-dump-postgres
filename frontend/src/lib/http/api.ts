import axios from './axios';
import { AxiosResponse } from 'axios';

// Định nghĩa các interface
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Định nghĩa các services

// Ví dụ service cho User
export const UserService = {
  getProfile: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.get('/api/users/profile');
  },

  updateProfile: (data: any): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.put('/api/users/profile', data);
  },
};

// Auth Service
export const AuthService = {
  login: (credentials: { username: string; password: string }): Promise<AxiosResponse<ApiResponse<{ token: string; user: any }>>> => {
    return axios.post('/api/login', credentials);
  },

  logout: (): Promise<AxiosResponse<ApiResponse<null>>> => {
    return axios.post('/api/logout');
  },

  getMe: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.get('/api/me');
  }
};

// Config Service
export const ConfigService = {
  getConfig: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.get('/api/configs');
  },

  saveConfig: (config: any): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post('/api/config', config);
  }
};

// Backup Service
export const BackupService = {
  getBackups: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.get('/api/backups');
  },

  createBackup: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post('/dump');
  },

  deleteBackup: (id: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.delete(`/api/backups/${id}`);
  },

  uploadToDrive: (id: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post(`/upload/${id}`);
  },
  
  downloadBackup: (id: string): string => {
    return `/download/${id}?token=${localStorage.getItem('token') || ''}`;
  }
};

// Profile Service
export const ProfileService = {
  getProfiles: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.get('/api/profiles');
  },

  createProfile: (name: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post('/api/profiles', { name });
  },

  updateProfile: (id: string, name: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.put(`/api/profiles/${id}`, { name });
  },

  deleteProfile: (id: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.delete(`/api/profiles/${id}`);
  },

  toggleActive: (id: string, isActive: boolean): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post(`/api/profiles/${id}/toggle-active`, { is_active: isActive });
  }
};

// Google Drive Service
export const GoogleDriveService = {
  getAuthUrl: (): Promise<AxiosResponse<ApiResponse<{ auth_url: string }>>> => {
    return axios.get('/api/auth/url');
  },

  authCallback: (code: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post('/api/auth/callback', { code });
  },

  getStatus: (): Promise<AxiosResponse<ApiResponse<{ drive_status: { is_authenticated: boolean } }>>> => {
    return axios.get('/api/drive/status');
  },
  
  getDriveInfo: (): Promise<AxiosResponse<ApiResponse<{ 
    email: string; 
    name: string;
    quota: {
      limit: number;
      used: number;
      available: number;
    }
  }>>> => {
    return axios.get('/api/drive/info');
  },
  
  disconnectDrive: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    console.log("Gọi API gỡ liên kết Google Drive: /api/drive/disconnect");
    return axios.post('/api/drive/disconnect')
      .catch(error => {
        console.error("Lỗi khi gỡ liên kết Drive:", error.response?.status, error.message);
        if (error.response?.status === 404) {
          // Thử gọi lại với đường dẫn tương đối
          console.log("Thử lại với đường dẫn đầy đủ");
          return axios.post(window.location.origin + '/api/drive/disconnect');
        }
        throw error;
      });
  }
};

// Các service khác có thể được thêm vào đây 