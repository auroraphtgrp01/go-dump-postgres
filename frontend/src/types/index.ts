export interface IUser {
  id: string;
  username: string;
  email?: string;
}

export interface IProfile {
  id: string;
  name: string;
  description: string;
  db_user: string;
  db_password: string;
  container_name: string;
  db_name: string;
  is_active: boolean;
  google_client_id: string;
  google_client_secret: string;
  backup_dir: string;
  cron_schedule: string;
  backup_retention: number;
  upload_to_drive: boolean;
  folder_drive: string;
  created_at: string;
  updated_at: string;
}

export interface IBackupFile {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  uploaded: boolean;
  driveLink?: string;
}

export interface IOperationResult {
  success: boolean;
  message: string;
} 