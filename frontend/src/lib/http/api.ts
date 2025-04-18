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
    return axios.get('/api/config');
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
    return axios.post('/api/backup');
  },

  deleteBackup: (id: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.delete(`/api/backup/${id}`);
  },

  uploadToDrive: (id: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return axios.post(`/api/backup/${id}/upload`);
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
  }
};

// Các service khác có thể được thêm vào đây 