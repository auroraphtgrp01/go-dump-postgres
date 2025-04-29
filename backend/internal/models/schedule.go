package models

import "time"

// ScheduleOption đại diện cho tùy chọn lên lịch backup
type ScheduleOption struct {
	Value       string `json:"value"`       // Giá trị cron
	Label       string `json:"label"`       // Nhãn hiển thị
	Description string `json:"description"` // Mô tả chi tiết
}

// JobLog đại diện cho một bản ghi log về việc chạy job backup
type JobLog struct {
	ID         int64     `json:"id"`
	ProfileID  int64     `json:"profile_id"`
	Status     string    `json:"status"` // success, failed, running
	StartTime  time.Time `json:"start_time"`
	EndTime    time.Time `json:"end_time"`
	BackupFile string    `json:"backup_file"` // Đường dẫn file backup nếu thành công
	Message    string    `json:"message"`     // Thông báo lỗi hoặc thành công
}

// GetScheduleOptions trả về danh sách các tùy chọn lên lịch backup
func GetScheduleOptions() []ScheduleOption {
	return []ScheduleOption{
		{
			Value:       "*/1 * * * *",
			Label:       "Mỗi 1 phút",
			Description: "Thực hiện backup mỗi 1 phút (chỉ nên sử dụng cho mục đích kiểm thử)",
		},
		{
			Value:       "0 */1 * * *",
			Label:       "Mỗi 1 giờ",
			Description: "Thực hiện backup mỗi giờ vào đầu giờ",
		},
		{
			Value:       "0 2 * * *",
			Label:       "Mỗi 1 ngày vào 2h sáng",
			Description: "Thực hiện backup hàng ngày vào lúc 2 giờ sáng",
		},
		{
			Value:       "0 2 * * 0",
			Label:       "Mỗi 1 tuần vào 2h sáng",
			Description: "Thực hiện backup mỗi tuần vào Chủ Nhật lúc 2 giờ sáng",
		},
		{
			Value:       "0 2 1 * *",
			Label:       "Mỗi tháng 1 lần vào 2h sáng",
			Description: "Thực hiện backup vào ngày mùng 1 hàng tháng lúc 2 giờ sáng",
		},
	}
}
