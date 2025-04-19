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
  path: string;
  size: number;
  createdAt: string;
  uploaded: boolean;
  fileExists: boolean;
  uploadedAt?: string;
  driveLink?: string;
}

export interface IOperationResult {
  success: boolean;
  message: string;
}

export interface IScheduleOption {
  value: string;
  label: string;
  description: string;
}

export interface IActiveJob {
  profile_id: string;
  profile_name: string;
  schedule: string;
  next_run: string;
  duration: string;
  status: string;
  success_count: number;
  failed_count: number;
}

export interface IJobLog {
  id: string;
  profile_id: string;
  status: string;
  start_time: string;
  end_time: string;
  backup_file: string;
  message: string;
} 