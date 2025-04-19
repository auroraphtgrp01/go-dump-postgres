package database

import (
	"database/sql"
	"time"

	"github.com/backup-cronjob/internal/models"
)

// CreateJobLog tạo một bản ghi log mới cho việc chạy job
func CreateJobLog(profileID int64, status string, startTime time.Time) (int64, error) {
	result, err := DB.Exec(
		`INSERT INTO job_logs (profile_id, status, start_time) VALUES (?, ?, ?)`,
		profileID, status, startTime,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// UpdateJobLog cập nhật trạng thái của một bản ghi log
func UpdateJobLog(logID int64, status string, endTime time.Time, backupFile, message string) error {
	_, err := DB.Exec(
		`UPDATE job_logs SET status = ?, end_time = ?, backup_file = ?, message = ? WHERE id = ?`,
		status, endTime, backupFile, message, logID,
	)
	return err
}

// GetJobLogsByProfile lấy lịch sử các lần chạy job của một profile
func GetJobLogsByProfile(profileID int64, limit int) ([]models.JobLog, error) {
	rows, err := DB.Query(
		`SELECT id, profile_id, status, start_time, end_time, backup_file, message 
		FROM job_logs 
		WHERE profile_id = ? 
		ORDER BY start_time DESC 
		LIMIT ?`,
		profileID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []models.JobLog{}
	for rows.Next() {
		var log models.JobLog
		var endTime sql.NullTime
		var backupFile, message sql.NullString

		err := rows.Scan(&log.ID, &log.ProfileID, &log.Status, &log.StartTime, &endTime, &backupFile, &message)
		if err != nil {
			return nil, err
		}

		if endTime.Valid {
			log.EndTime = endTime.Time
		}
		if backupFile.Valid {
			log.BackupFile = backupFile.String
		}
		if message.Valid {
			log.Message = message.String
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// GetRecentJobLogs lấy các bản ghi log gần đây nhất
func GetRecentJobLogs(limit int) ([]models.JobLog, error) {
	rows, err := DB.Query(
		`SELECT jl.id, jl.profile_id, jl.status, jl.start_time, jl.end_time, jl.backup_file, jl.message
		FROM job_logs jl
		JOIN profiles p ON jl.profile_id = p.id
		ORDER BY jl.start_time DESC 
		LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	logs := []models.JobLog{}
	for rows.Next() {
		var log models.JobLog
		var endTime sql.NullTime
		var backupFile, message sql.NullString

		err := rows.Scan(
			&log.ID, &log.ProfileID, &log.Status, &log.StartTime, &endTime,
			&backupFile, &message,
		)
		if err != nil {
			return nil, err
		}

		if endTime.Valid {
			log.EndTime = endTime.Time
		}
		if backupFile.Valid {
			log.BackupFile = backupFile.String
		}
		if message.Valid {
			log.Message = message.String
		}

		logs = append(logs, log)
	}

	return logs, nil
}

// CountJobRunsByProfile đếm số lần chạy job theo từng trạng thái cho profile cụ thể
func CountJobRunsByProfile(profileID int64) (map[string]int, error) {
	rows, err := DB.Query(
		`SELECT status, COUNT(*) as count
		FROM job_logs
		WHERE profile_id = ?
		GROUP BY status`,
		profileID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		counts[status] = count
	}

	return counts, nil
}

// DeleteJobLogsForProfile xóa tất cả log của một profile
func DeleteJobLogsForProfile(profileID int64) error {
	_, err := DB.Exec("DELETE FROM job_logs WHERE profile_id = ?", profileID)
	return err
}

// DeleteOldJobLogs xóa các bản ghi log cũ hơn một ngày cụ thể
func DeleteOldJobLogs(olderThan time.Time) (int64, error) {
	result, err := DB.Exec("DELETE FROM job_logs WHERE start_time < ?", olderThan)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}
