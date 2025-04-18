import { createServer, Model, Response } from 'miragejs';
import { IProfile } from '@/types';

// Dữ liệu mẫu để test
const mockProfiles: IProfile[] = [
  {
    id: '1',
    name: 'Profile Dev',
    description: 'Profile cho môi trường phát triển',
    db_user: 'postgres',
    db_password: '••••••••',
    container_name: 'postgres-dev',
    db_name: 'postgres',
    is_active: true,
    google_client_id: '',
    google_client_secret: '',
    backup_dir: './backup/',
    cron_schedule: '0 0 * * *',
    backup_retention: 7,
    upload_to_drive: false,
    folder_drive: 'Postgres Backup',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Profile UAT',
    description: 'Profile cho môi trường kiểm thử',
    db_user: 'postgres',
    db_password: '••••••••',
    container_name: 'postgres-uat',
    db_name: 'postgres_uat',
    is_active: false,
    google_client_id: '',
    google_client_secret: '',
    backup_dir: './backup/uat/',
    cron_schedule: '0 0 * * *',
    backup_retention: 14,
    upload_to_drive: false,
    folder_drive: 'Postgres Backup UAT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Tạo Mock Server
export function makeServer({ environment = 'development' } = {}) {
  let server = createServer({
    environment,
    models: {
      profile: Model,
      config: Model,
      backup: Model
    },
    
    routes() {
      this.namespace = 'api';
      
      // Auth endpoints
      this.post('/login', () => {
        return {
          success: true,
          token: 'mock-token',
          user: {
            id: '1',
            username: 'admin',
            email: 'admin@example.com'
          }
        };
      });
      
      // Config endpoints
      this.get('/configs', () => {
        return {
          success: true,
          data: [
            {
              group: 'backup',
              label: 'Sao lưu',
              configs: [
                { id: 1, key: 'BACKUP_DIR', value: './backup/', group: 'backup', label: 'Thư mục sao lưu', type: 'text' },
                { id: 2, key: 'CRON_SCHEDULE', value: '0 0 * * *', group: 'backup', label: 'Lịch sao lưu (Cron)', type: 'text' },
                { id: 3, key: 'BACKUP_RETENTION_DAYS', value: '7', group: 'backup', label: 'Số ngày lưu trữ', type: 'number' }
              ]
            },
            {
              group: 'db',
              label: 'Cơ sở dữ liệu',
              configs: [
                { id: 4, key: 'DB_USER', value: 'postgres', group: 'db', label: 'Tên đăng nhập DB', type: 'text' },
                { id: 5, key: 'DB_PASSWORD', value: '••••••••', group: 'db', label: 'Mật khẩu DB', type: 'password' },
                { id: 6, key: 'CONTAINER_NAME', value: 'postgres-container', group: 'db', label: 'Tên container', type: 'text' },
                { id: 7, key: 'DB_NAME', value: 'postgres', group: 'db', label: 'Tên database', type: 'text' }
              ]
            },
            {
              group: 'google',
              label: 'Google Drive',
              configs: [
                { id: 8, key: 'GOOGLE_CLIENT_ID', value: '', group: 'google', label: 'Client ID', type: 'text' },
                { id: 9, key: 'GOOGLE_CLIENT_SECRET', value: '', group: 'google', label: 'Client Secret', type: 'password' },
                { id: 10, key: 'GOOGLE_FOLDER', value: 'Postgres Backup', group: 'google', label: 'Tên thư mục Drive', type: 'text' },
                { id: 11, key: 'UPLOAD_TO_DRIVE', value: 'false', group: 'google', label: 'Tự động upload', type: 'switch' }
              ]
            }
          ]
        };
      });
      
      this.post('/configs', (_, request) => {
        const attrs = JSON.parse(request.requestBody);
        console.log('Saving configs:', attrs);
        return { success: true };
      });
      
      // Profile endpoints
      this.get('/profiles', () => {
        return {
          success: true,
          profiles: mockProfiles
        };
      });
      
      this.post('/profiles', (schema, request) => {
        const attrs = JSON.parse(request.requestBody);
        const newProfile = {
          ...attrs,
          id: Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        mockProfiles.push(newProfile as IProfile);
        return {
          success: true,
          profile: newProfile
        };
      });
      
      this.put('/profiles/:id', (schema, request) => {
        const id = request.params.id;
        const attrs = JSON.parse(request.requestBody);
        const index = mockProfiles.findIndex(p => p.id === id);
        
        if (index !== -1) {
          mockProfiles[index] = {
            ...mockProfiles[index],
            ...attrs,
            updated_at: new Date().toISOString()
          };
          return {
            success: true,
            profile: mockProfiles[index]
          };
        }
        
        return new Response(404, {}, { success: false, error: 'Profile không tồn tại' });
      });
      
      this.delete('/profiles/:id', (schema, request) => {
        const id = request.params.id;
        const index = mockProfiles.findIndex(p => p.id === id);
        
        if (index !== -1) {
          mockProfiles.splice(index, 1);
          return { success: true };
        }
        
        return new Response(404, {}, { success: false, error: 'Profile không tồn tại' });
      });
      
      this.post('/profiles/:id/toggle-active', (schema, request) => {
        const id = request.params.id;
        
        // Đặt tất cả về inactive
        mockProfiles.forEach(p => p.is_active = false);
        
        // Set profile được chọn thành active
        const profile = mockProfiles.find(p => p.id === id);
        if (profile) {
          profile.is_active = true;
          return { success: true };
        }
        
        return new Response(404, {}, { success: false, error: 'Profile không tồn tại' });
      });
      
      // Backup endpoints
      this.get('/backups', () => {
        return {
          success: true,
          backups: [
            {
              id: '1',
              name: 'postgres_backup_20230712_120000.sql',
              createdAt: '2023-07-12T12:00:00Z',
              size: 1024 * 1024 * 5, // 5 MB
              uploaded: true,
              driveLink: 'https://drive.google.com/example'
            },
            {
              id: '2',
              name: 'postgres_backup_20230711_120000.sql',
              createdAt: '2023-07-11T12:00:00Z',
              size: 1024 * 1024 * 4.5, // 4.5 MB
              uploaded: false
            }
          ]
        };
      });
    },
  });

  return server;
} 