export interface IUser {
  id: string;
  username: string;
  email?: string;
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