package logger

import (
	"log"
	"time"
)

// LogEntry đại diện cho một mục log
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
}

// Info ghi log cấp độ Info
func Info(message string) {
	// Ghi log vào console
	log.Printf("[INFO] %s", message)
}

// Error ghi log cấp độ Error
func Error(message string) {
	// Ghi log vào console
	log.Printf("[ERROR] %s", message)
}
