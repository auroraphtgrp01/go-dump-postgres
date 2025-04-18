package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/backup-cronjob/internal/database"
	"github.com/backup-cronjob/internal/models"
	"github.com/gin-gonic/gin"
)

// GetProfilesHandler trả về danh sách profiles
func (h *Handler) GetProfilesHandler(c *gin.Context) {
	profiles, err := database.GetAllProfiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Bỏ mật khẩu trước khi trả về client
	for i := range profiles {
		if profiles[i].DBPassword != "" {
			profiles[i].DBPassword = "••••••••"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"profiles": profiles,
	})
}

// GetProfileHandler trả về thông tin của một profile
func (h *Handler) GetProfileHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID profile không hợp lệ",
		})
		return
	}

	profile, err := database.GetProfile(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy profile",
		})
		return
	}

	// Ẩn mật khẩu
	if profile.DBPassword != "" {
		profile.DBPassword = "••••••••"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"profile": profile,
	})
}

// CreateProfileHandler tạo một profile mới
func (h *Handler) CreateProfileHandler(c *gin.Context) {
	var profile models.DatabaseProfile
	if err := c.ShouldBindJSON(&profile); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ",
		})
		return
	}

	// Kiểm tra thông tin bắt buộc
	if profile.Name == "" || profile.DBUser == "" || profile.ContainerName == "" || profile.DBName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Thiếu thông tin bắt buộc (tên, tên người dùng database, tên container, tên database)",
		})
		return
	}

	// Thiết lập thời gian
	now := time.Now()
	profile.CreatedAt = now
	profile.UpdatedAt = now

	// Tạo profile
	id, err := database.CreateProfile(profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể tạo profile: %v", err),
		})
		return
	}

	// Lấy profile đã tạo
	profile, _ = database.GetProfile(id)

	// Ẩn mật khẩu
	if profile.DBPassword != "" {
		profile.DBPassword = "••••••••"
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Tạo profile thành công",
		"profile": profile,
	})
}

// UpdateProfileHandler cập nhật một profile
func (h *Handler) UpdateProfileHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID profile không hợp lệ",
		})
		return
	}

	// Lấy profile hiện tại
	currentProfile, err := database.GetProfile(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy profile",
		})
		return
	}

	// Lấy dữ liệu cập nhật
	var updateData struct {
		Name          string `json:"name"`
		Description   string `json:"description"`
		DBUser        string `json:"db_user"`
		DBPassword    string `json:"db_password"`
		ContainerName string `json:"container_name"`
		DBName        string `json:"db_name"`
		IsActive      *bool  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Dữ liệu không hợp lệ",
		})
		return
	}

	// Cập nhật thông tin
	if updateData.Name != "" {
		currentProfile.Name = updateData.Name
	}
	if updateData.Description != "" {
		currentProfile.Description = updateData.Description
	}
	if updateData.DBUser != "" {
		currentProfile.DBUser = updateData.DBUser
	}
	if updateData.DBPassword != "" && updateData.DBPassword != "••••••••" {
		currentProfile.DBPassword = updateData.DBPassword
	}
	if updateData.ContainerName != "" {
		currentProfile.ContainerName = updateData.ContainerName
	}
	if updateData.DBName != "" {
		currentProfile.DBName = updateData.DBName
	}
	if updateData.IsActive != nil {
		currentProfile.IsActive = *updateData.IsActive
	}

	// Cập nhật thời gian
	currentProfile.UpdatedAt = time.Now()

	// Lưu cập nhật
	err = database.UpdateProfile(currentProfile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể cập nhật profile: %v", err),
		})
		return
	}

	// Nếu profile được đánh dấu là active, cập nhật trạng thái hoạt động
	if currentProfile.IsActive {
		err = database.SetActiveProfile(id)
		if err != nil {
			log.Printf("Cảnh báo: Không thể cập nhật trạng thái hoạt động: %v", err)
		}
	}

	// Ẩn mật khẩu trước khi trả về
	currentProfile.DBPassword = "••••••••"

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Cập nhật profile thành công",
		"profile": currentProfile,
	})
}

// DeleteProfileHandler xóa một profile
func (h *Handler) DeleteProfileHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID profile không hợp lệ",
		})
		return
	}

	// Kiểm tra profile có tồn tại không
	_, err = database.GetProfile(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy profile",
		})
		return
	}

	// Xóa profile
	err = database.DeleteProfile(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể xóa profile: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Xóa profile thành công",
	})
}

// SetActiveProfileHandler đặt một profile làm hoạt động
func (h *Handler) SetActiveProfileHandler(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "ID profile không hợp lệ",
		})
		return
	}

	// Kiểm tra profile có tồn tại không
	profile, err := database.GetProfile(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy profile",
		})
		return
	}

	// Đặt profile làm hoạt động
	err = database.SetActiveProfile(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Không thể đặt profile làm hoạt động: %v", err),
		})
		return
	}

	// Ẩn mật khẩu
	profile.DBPassword = "••••••••"
	profile.IsActive = true

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Đã đặt profile '%s' làm hoạt động", profile.Name),
		"profile": profile,
	})
}

// GetActiveProfileHandler trả về profile đang hoạt động
func (h *Handler) GetActiveProfileHandler(c *gin.Context) {
	profile, err := database.GetActiveProfile()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Không tìm thấy profile hoạt động",
		})
		return
	}

	// Ẩn mật khẩu
	if profile.DBPassword != "" {
		profile.DBPassword = "••••••••"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"profile": profile,
	})
}
