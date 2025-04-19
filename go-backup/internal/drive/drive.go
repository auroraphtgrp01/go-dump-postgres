package drive

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/backup-cronjob/internal/backupdb"
	"github.com/backup-cronjob/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
)

// DriveUploader quản lý việc upload file lên Google Drive
type DriveUploader struct {
	Config  *config.Config
	client  *http.Client
	service *drive.Service
}

// NewDriveUploader tạo instance mới của DriveUploader
func NewDriveUploader(cfg *config.Config) *DriveUploader {
	return &DriveUploader{
		Config: cfg,
	}
}

// Init khởi tạo DriveUploader
func (d *DriveUploader) Init() error {
	// Kiểm tra client ID và client secret
	if d.Config.GoogleClientID == "" {
		return fmt.Errorf("không thể khởi tạo Google Drive Uploader: thiếu Client ID của Google")
	}

	if d.Config.GoogleClientSecret == "" {
		return fmt.Errorf("không thể khởi tạo Google Drive Uploader: thiếu Client Secret của Google")
	}

	// Kiểm tra giá trị mặc định hoặc không hợp lệ
	if d.Config.GoogleClientID == "123" || len(d.Config.GoogleClientID) < 20 {
		return fmt.Errorf("Google Client ID không hợp lệ hoặc là giá trị mặc định. Vui lòng cập nhật Client ID của Google")
	}

	if d.Config.GoogleClientSecret == "123" || len(d.Config.GoogleClientSecret) < 10 {
		return fmt.Errorf("Google Client Secret không hợp lệ hoặc là giá trị mặc định. Vui lòng cập nhật Client Secret của Google")
	}

	client, err := d.getClient()
	if err != nil {
		return fmt.Errorf("lỗi khi khởi tạo Google Client: %v", err)
	}

	d.client = client

	// Khởi tạo Drive service nếu chưa có
	if d.service == nil {
		srv, err := drive.New(client)
		if err != nil {
			return fmt.Errorf("không thể tạo dịch vụ Drive: %v", err)
		}
		d.service = srv
	}

	return nil
}

// GetOAuthConfig trả về cấu hình OAuth2
func (d *DriveUploader) GetOAuthConfig() *oauth2.Config {
	// Xác định RedirectURL dựa trên biến môi trường DOMAIN_HOST
	var redirectURL string
	domainHost := os.Getenv("DOMAIN_HOST")

	if domainHost != "" {
		// Trường hợp có biến môi trường DOMAIN_HOST
		redirectURL = fmt.Sprintf("https://%s/callback", domainHost)
	} else {
		// Trường hợp không có biến môi trường, sử dụng localhost
		redirectURL = fmt.Sprintf("http://localhost:%s/callback", d.Config.WebAppPort)
	}

	return &oauth2.Config{
		ClientID:     d.Config.GoogleClientID,
		ClientSecret: d.Config.GoogleClientSecret,
		Scopes:       []string{drive.DriveFileScope},
		RedirectURL:  redirectURL,
		Endpoint:     google.Endpoint,
	}
}

// GetAuthURL tạo URL xác thực
func (d *DriveUploader) GetAuthURL() string {
	config := d.GetOAuthConfig()
	// Chỉ sử dụng một trong hai tham số: prompt hoặc approval_prompt
	// Sử dụng access_type=offline để nhận refresh token
	// Thêm state để bảo vệ CSRF
	url := config.AuthCodeURL(
		"state-token",
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "consent"),
	)
	fmt.Printf("Đã tạo URL xác thực: %s\n", url)
	return url
}

// ExchangeAuthCode đổi mã xác thực lấy token
func (d *DriveUploader) ExchangeAuthCode(code string) (*oauth2.Token, error) {
	fmt.Printf("Bắt đầu đổi mã xác thực lấy token với code có độ dài %d ký tự\n", len(code))

	config := d.GetOAuthConfig()
	fmt.Printf("Config OAuth2: Scopes=%v, RedirectURL=%s\n", config.Scopes, config.RedirectURL)

	// In ra thông tin chi tiết để debug
	fmt.Printf("Client ID: %s***\n", d.Config.GoogleClientID[:10])
	fmt.Printf("Client Secret: %s***\n", d.Config.GoogleClientSecret[:5])

	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		fmt.Printf("Lỗi khi đổi mã xác thực: %v\n", err)
		return nil, fmt.Errorf("không thể đổi mã xác thực: %v", err)
	}

	fmt.Printf("Đã lấy được token, hết hạn vào: %v\n", token.Expiry)
	fmt.Printf("Access Token có độ dài: %d ký tự\n", len(token.AccessToken))
	fmt.Printf("Có Refresh Token: %v\n", token.RefreshToken != "")

	// Lưu token
	tokenFile := filepath.Join(d.Config.TokenDir, "token.json")
	fmt.Printf("Lưu token vào file: %s\n", tokenFile)

	err = d.saveToken(tokenFile, token)
	if err != nil {
		fmt.Printf("Lỗi khi lưu token: %v\n", err)
		return nil, fmt.Errorf("không thể lưu token: %v", err)
	}

	fmt.Println("Đã lưu token thành công!")
	return token, nil
}

// getClient khởi tạo OAuth2 client cho Google Drive API
func (d *DriveUploader) getClient() (*http.Client, error) {
	b := []byte(fmt.Sprintf(`{"installed":{"client_id":"%s","project_id":"go-backup","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_secret":"%s","redirect_uris":["http://localhost"]}}`, d.Config.GoogleClientID, d.Config.GoogleClientSecret))

	// Nếu không thể marshal JSON, báo lỗi
	if len(b) <= 2 {
		return nil, fmt.Errorf("thông tin xác thực Google không hợp lệ, vui lòng kiểm tra lại client ID và client secret")
	}

	config, err := google.ConfigFromJSON(b, drive.DriveFileScope)
	if err != nil {
		return nil, fmt.Errorf("không thể đọc thông tin xác thực Google: %v", err)
	}

	// Đảm bảo thư mục TokenDir tồn tại
	if _, err := os.Stat(d.Config.TokenDir); os.IsNotExist(err) {
		if err := os.MkdirAll(d.Config.TokenDir, 0755); err != nil {
			return nil, fmt.Errorf("không thể tạo thư mục lưu token: %v", err)
		}
	}

	cacheFile := filepath.Join(d.Config.TokenDir, "token.json")

	tok, err := d.tokenFromFile(cacheFile)
	if err != nil {
		tok, err = d.getTokenFromWeb(config)
		if err != nil {
			return nil, fmt.Errorf("không thể nhận token xác thực từ web: %v", err)
		}
		err = d.saveToken(cacheFile, tok)
		if err != nil {
			return nil, fmt.Errorf("không thể lưu token: %v", err)
		}
	}

	// Kiểm tra thời hạn token
	if tok.Expiry.Before(time.Now()) {
		// Token đã hết hạn, thử refresh
		if tok.RefreshToken != "" {
			src := config.TokenSource(context.Background(), tok)
			newToken, err := src.Token()
			if err != nil {
				return nil, fmt.Errorf("không thể làm mới token đã hết hạn: %v. Vui lòng xác thực lại", err)
			}
			tok = newToken
			err = d.saveToken(cacheFile, tok)
			if err != nil {
				return nil, fmt.Errorf("không thể lưu token đã làm mới: %v", err)
			}
			fmt.Println("Đã làm mới token xác thực Google thành công")
		} else {
			return nil, fmt.Errorf("token đã hết hạn và không có refresh token. Vui lòng xóa file token.json và xác thực lại")
		}
	}

	return config.Client(context.Background(), tok), nil
}

// CheckAuth kiểm tra đã xác thực chưa
func (d *DriveUploader) CheckAuth() bool {
	tokenFile := filepath.Join(d.Config.TokenDir, "token.json")
	fmt.Printf("Đang kiểm tra file token tại: %s\n", tokenFile)

	token, err := d.tokenFromFile(tokenFile)
	if err != nil {
		fmt.Printf("Không thể đọc token: %v\n", err)
		return false
	}

	// Kiểm tra thời hạn token
	if token.Expiry.Before(time.Now()) {
		fmt.Printf("Token đã hết hạn vào %v\n", token.Expiry)

		// Thử refresh token
		config := d.GetOAuthConfig()
		tokenSource := config.TokenSource(context.Background(), token)

		newToken, err := tokenSource.Token()
		if err != nil {
			fmt.Printf("Không thể làm mới token: %v\n", err)
			return false
		}

		// Lưu token mới
		if err := d.saveToken(tokenFile, newToken); err != nil {
			fmt.Printf("Không thể lưu token mới: %v\n", err)
			return false
		}

		fmt.Println("Đã làm mới và lưu token thành công")
	} else {
		fmt.Printf("Token hợp lệ, hết hạn vào: %v\n", token.Expiry)
	}

	return true
}

// tokenFromFile đọc token từ file
func (d *DriveUploader) tokenFromFile(file string) (*oauth2.Token, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	token := &oauth2.Token{}
	err = json.NewDecoder(f).Decode(token)
	return token, err
}

// TokenFromFile là phiên bản công khai của tokenFromFile
func (d *DriveUploader) TokenFromFile(file string) (*oauth2.Token, error) {
	return d.tokenFromFile(file)
}

// getTokenFromWeb yêu cầu người dùng xác thực qua trình duyệt
func (d *DriveUploader) getTokenFromWeb(config *oauth2.Config) (*oauth2.Token, error) {
	// Tạo URL xác thực
	authURL := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	fmt.Printf("\n=== HƯỚNG DẪN XÁC THỰC GOOGLE DRIVE ===\n")
	fmt.Printf("\nBước 1: Mở URL sau trong trình duyệt:\n")
	fmt.Printf("%s\n", authURL)
	fmt.Printf("\nBước 2: Đăng nhập Google và cho phép quyền truy cập\n")
	fmt.Printf("\nBước 3: Copy mã và paste vào đây\n\n")

	var code string
	fmt.Print("Nhập mã xác thực: ")
	if _, err := fmt.Scan(&code); err != nil {
		return nil, fmt.Errorf("không thể đọc mã xác thực: %v", err)
	}

	// Đổi mã xác thực lấy token
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		return nil, fmt.Errorf("không thể đổi mã xác thực: %v", err)
	}

	return token, nil
}

// saveToken lưu token vào file
func (d *DriveUploader) saveToken(path string, token *oauth2.Token) error {
	// Đảm bảo thư mục tồn tại
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}

	// Mở file để ghi
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	// Ghi token vào file dưới dạng JSON
	return json.NewEncoder(f).Encode(token)
}

// createOrFindFolder tạo hoặc tìm folder trên Drive
func (d *DriveUploader) createOrFindFolder(name string, parentID string) (string, error) {
	// Kiểm tra service đã được khởi tạo chưa
	if d.service == nil {
		return "", fmt.Errorf("Google Drive service chưa được khởi tạo")
	}

	// Tạo query để tìm folder
	query := fmt.Sprintf("name='%s' and mimeType='application/vnd.google-apps.folder'", name)
	if parentID != "" {
		query += fmt.Sprintf(" and '%s' in parents", parentID)
	}

	// Tìm folder
	r, err := d.service.Files.List().Q(query).Fields("files(id, name)").Do()
	if err != nil {
		return "", fmt.Errorf("không thể tìm folder: %v", err)
	}

	// Nếu folder đã tồn tại
	if len(r.Files) > 0 {
		folderID := r.Files[0].Id
		fmt.Printf("Sử dụng folder có sẵn: %s (ID: %s)\n", name, folderID)
		return folderID, nil
	}

	// Nếu chưa có folder, tạo mới
	folderMetadata := &drive.File{
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
	}

	// Nếu có parent folder, thiết lập parents
	if parentID != "" {
		folderMetadata.Parents = []string{parentID}
	}

	// Tạo folder
	folder, err := d.service.Files.Create(folderMetadata).Fields("id").Do()
	if err != nil {
		return "", fmt.Errorf("không thể tạo folder: %v", err)
	}

	fmt.Printf("Đã tạo folder mới: %s (ID: %s)\n", name, folder.Id)
	return folder.Id, nil
}

// checkFileExists kiểm tra file đã tồn tại trong folder chưa
func (d *DriveUploader) checkFileExists(fileName string, folderID string) (*drive.File, error) {
	// Kiểm tra service đã được khởi tạo chưa
	if d.service == nil {
		return nil, fmt.Errorf("Google Drive service chưa được khởi tạo")
	}

	// Tạo query để tìm file trong thư mục
	query := fmt.Sprintf("name='%s' and '%s' in parents and trashed=false", fileName, folderID)

	// Thực hiện tìm kiếm
	fileList, err := d.service.Files.List().Q(query).Fields("files(id, name)").Do()
	if err != nil {
		return nil, fmt.Errorf("không thể kiểm tra file tồn tại: %v", err)
	}

	// Kiểm tra kết quả
	if len(fileList.Files) > 0 {
		fmt.Printf("Đã tìm thấy file tồn tại trên Drive: %s (ID: %s)\n", fileName, fileList.Files[0].Id)
		return fileList.Files[0], nil
	}

	// Không tìm thấy file
	return nil, nil
}

// CheckDriveConfig kiểm tra tất cả cấu hình Drive và báo cáo các vấn đề
func (d *DriveUploader) CheckDriveConfig() map[string]string {
	issues := make(map[string]string)

	// Kiểm tra Client ID
	if d.Config.GoogleClientID == "" {
		issues["GoogleClientID"] = "Thiếu Google Client ID"
	} else if d.Config.GoogleClientID == "123" || len(d.Config.GoogleClientID) < 20 {
		issues["GoogleClientID"] = "Google Client ID không hợp lệ hoặc là giá trị mặc định"
	}

	// Kiểm tra Client Secret
	if d.Config.GoogleClientSecret == "" {
		issues["GoogleClientSecret"] = "Thiếu Google Client Secret"
	} else if d.Config.GoogleClientSecret == "123" || len(d.Config.GoogleClientSecret) < 10 {
		issues["GoogleClientSecret"] = "Google Client Secret không hợp lệ hoặc là giá trị mặc định"
	}

	// Kiểm tra token dir
	if d.Config.TokenDir == "" {
		issues["TokenDir"] = "Thiếu đường dẫn thư mục token"
	} else {
		if _, err := os.Stat(d.Config.TokenDir); os.IsNotExist(err) {
			if err := os.MkdirAll(d.Config.TokenDir, 0755); err != nil {
				issues["TokenDir"] = fmt.Sprintf("Không thể tạo thư mục token: %v", err)
			}
		}
	}

	// Kiểm tra tên thư mục Drive
	if d.Config.FolderDrive == "" {
		issues["FolderDrive"] = "Thiếu tên thư mục trên Google Drive"
	}

	// Kiểm tra xác thực
	tokenFile := filepath.Join(d.Config.TokenDir, "token.json")
	if _, err := os.Stat(tokenFile); os.IsNotExist(err) {
		issues["AuthToken"] = "Chưa xác thực với Google Drive, cần thực hiện xác thực"
	} else {
		token, err := d.tokenFromFile(tokenFile)
		if err != nil {
			issues["AuthToken"] = fmt.Sprintf("Lỗi đọc token xác thực: %v", err)
		} else if token.Expiry.Before(time.Now()) {
			if token.RefreshToken == "" {
				issues["AuthToken"] = "Token đã hết hạn và không có refresh token, cần xác thực lại"
			} else {
				// Thử refresh token
				config := d.GetOAuthConfig()
				tokenSource := config.TokenSource(context.Background(), token)
				_, err := tokenSource.Token()
				if err != nil {
					issues["AuthToken"] = fmt.Sprintf("Không thể làm mới token: %v", err)
				}
			}
		}
	}

	return issues
}

// UploadFile uploads a file to Google Drive and returns the result
func (d *DriveUploader) UploadFile(filePath string) UploadResult {
	fmt.Printf("Bắt đầu upload file: %s\n", filePath)

	// Kiểm tra các vấn đề cấu hình
	configIssues := d.CheckDriveConfig()
	if len(configIssues) > 0 {
		errorMessages := []string{}
		for key, issue := range configIssues {
			errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", key, issue))
		}
		errorMsg := fmt.Sprintf("Có vấn đề với cấu hình Google Drive: %s", strings.Join(errorMessages, "; "))
		fmt.Println(errorMsg)
		return UploadResult{
			Success: false,
			Message: errorMsg,
		}
	}

	// Kiểm tra service đã khởi tạo chưa
	if d.service == nil {
		fmt.Println("Google Drive service chưa được khởi tạo, đang khởi tạo...")
		err := d.Init()
		if err != nil {
			fmt.Printf("Lỗi khởi tạo Google Drive service: %v\n", err)
			return UploadResult{
				Success: false,
				Message: fmt.Sprintf("Không thể khởi tạo Google Drive service: %v", err),
			}
		}
		fmt.Println("Đã khởi tạo Google Drive service thành công")
	}

	// Kiểm tra file tồn tại
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("File không tồn tại: %s\n", filePath)
			return UploadResult{
				Success: false,
				Message: fmt.Sprintf("File không tồn tại: %s", filePath),
			}
		}
		fmt.Printf("Không thể đọc thông tin file: %v\n", err)
		return UploadResult{
			Success: false,
			Message: fmt.Sprintf("Không thể đọc thông tin file: %v", err),
		}
	}

	// Kiểm tra kích thước file
	if fileInfo.Size() == 0 {
		fmt.Println("File trống, không thể upload")
		return UploadResult{
			Success: false,
			Message: "File trống, không thể upload",
		}
	}

	// Lấy tên file
	fileName := filepath.Base(filePath)
	fmt.Printf("Tên file upload: %s, Kích thước: %d bytes\n", fileName, fileInfo.Size())

	// Đảm bảo thư mục tồn tại
	folderName := d.Config.FolderDrive
	fmt.Printf("Đang kiểm tra/tạo thư mục gốc: %s\n", folderName)
	folderID, err := d.createFolderIfNotExist(folderName)
	if err != nil {
		fmt.Printf("Lỗi tạo thư mục: %v\n", err)
		return UploadResult{
			Success: false,
			Message: fmt.Sprintf("Không thể tạo thư mục trên Drive: %v", err),
		}
	}
	fmt.Printf("Đã tìm thấy/tạo thư mục gốc với ID: %s\n", folderID)

	// Tìm ra thư mục ngày
	dirPath := filepath.Dir(filePath)
	dateFolder := filepath.Base(dirPath)
	fmt.Printf("Đang kiểm tra/tạo thư mục ngày: %s\n", dateFolder)

	// Tạo hoặc lấy folder ngày trên Drive
	dateFolderID, err := d.createOrFindFolder(dateFolder, folderID)
	if err != nil {
		fmt.Printf("Lỗi tạo thư mục ngày: %v\n", err)
		return UploadResult{
			Success: false,
			Message: fmt.Sprintf("Không thể tạo thư mục ngày trên Drive: %v", err),
		}
	}
	fmt.Printf("Đã tìm thấy/tạo thư mục ngày với ID: %s\n", dateFolderID)

	// Kiểm tra file đã tồn tại chưa
	fmt.Printf("Kiểm tra file đã tồn tại trên Drive: %s\n", fileName)
	existingFile, err := d.checkFileExists(fileName, dateFolderID)
	if err != nil {
		fmt.Printf("Lỗi kiểm tra file tồn tại: %v\n", err)
		return UploadResult{
			Success: false,
			Message: fmt.Sprintf("Lỗi kiểm tra file tồn tại: %v", err),
		}
	}

	// Nếu file đã tồn tại, báo cho người dùng biết và bỏ qua
	if existingFile != nil {
		fmt.Printf("File đã tồn tại trên Drive với ID: %s\n", existingFile.Id)
		webLink := fmt.Sprintf("https://drive.google.com/file/d/%s/view", existingFile.Id)

		// Cập nhật trạng thái file trong database
		fileId := strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))
		var backupID int64
		fmt.Sscanf(fileId, "%d", &backupID)
		if backupID > 0 {
			fmt.Printf("Cập nhật trạng thái upload cho file ID: %d\n", backupID)
			if err := backupdb.UpdateBackupUploadStatus(backupID, true, webLink); err != nil {
				fmt.Printf("Không thể cập nhật trạng thái upload: %v\n", err)
			} else {
				fmt.Println("Đã cập nhật trạng thái upload thành công")
			}
		}

		return UploadResult{
			Success:  true,
			FileID:   existingFile.Id,
			FileName: fileName,
			WebLink:  webLink,
			Message:  "File đã tồn tại trên Drive",
		}
	}

	// Mở file để đọc
	fmt.Println("Đang mở file để upload...")
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Printf("Không thể mở file: %v\n", err)
		return UploadResult{
			Success: false,
			Message: fmt.Sprintf("Không thể mở file: %v", err),
		}
	}
	defer file.Close()

	// Tạo file mới
	fmt.Println("Bắt đầu upload lên Google Drive...")
	driveFile, err := d.service.Files.Create(&drive.File{
		Name:    fileName,
		Parents: []string{dateFolderID},
	}).Media(file).Do()

	// Xử lý kết quả
	if err != nil {
		fmt.Printf("Lỗi upload file: %v\n", err)
		return UploadResult{
			Success: false,
			Message: fmt.Sprintf("Lỗi upload file lên Drive: %v", err),
		}
	}

	fmt.Printf("Upload thành công! File ID: %s\n", driveFile.Id)
	// Tạo webViewLink
	webLink := fmt.Sprintf("https://drive.google.com/file/d/%s/view", driveFile.Id)

	// Cập nhật trạng thái file trong database
	fileId := strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath))
	var backupID int64
	fmt.Sscanf(fileId, "%d", &backupID)
	if backupID > 0 {
		fmt.Printf("Cập nhật trạng thái upload cho file ID: %d\n", backupID)
		if err := backupdb.UpdateBackupUploadStatus(backupID, true, webLink); err != nil {
			fmt.Printf("Không thể cập nhật trạng thái upload: %v\n", err)
		} else {
			fmt.Println("Đã cập nhật trạng thái upload thành công")
		}
	}

	return UploadResult{
		Success:  true,
		FileID:   driveFile.Id,
		FileName: fileName,
		WebLink:  webLink,
		Message:  "Upload thành công",
	}
}

// createFolderIfNotExist tạo thư mục trên Drive nếu chưa tồn tại
func (d *DriveUploader) createFolderIfNotExist(folderName string) (string, error) {
	return d.createOrFindFolder(folderName, "")
}

// UploadAllBackups tải lên tất cả các file backup
func (d *DriveUploader) UploadAllBackups() error {
	// Kiểm tra các vấn đề cấu hình
	configIssues := d.CheckDriveConfig()
	if len(configIssues) > 0 {
		errorMessages := []string{}
		for key, issue := range configIssues {
			errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", key, issue))
		}
		return fmt.Errorf("Có vấn đề với cấu hình Google Drive: %s", strings.Join(errorMessages, "; "))
	}

	// Lấy danh sách các file backup
	backups, err := backupdb.GetAllBackups()
	if err != nil {
		return fmt.Errorf("không thể lấy danh sách backup: %w", err)
	}

	// Kiểm tra nếu không có backups
	if len(backups) == 0 {
		return fmt.Errorf("không có file backup nào để upload")
	}

	// Khởi tạo drive service nếu chưa được khởi tạo
	if d.service == nil {
		err := d.Init()
		if err != nil {
			return fmt.Errorf("không thể kết nối Google Drive: %v", err)
		}
	}

	// Tạo folder gốc nếu chưa có
	rootFolderID, err := d.createOrFindFolder(d.Config.FolderDrive, "")
	if err != nil {
		return fmt.Errorf("không thể tạo folder gốc: %v", err)
	}

	// Tạo map để theo dõi các thư mục ngày đã tạo
	dateFolders := make(map[string]string)
	successCount := 0
	failCount := 0
	skippedCount := 0

	// Upload từng file backup từ database
	for _, backup := range backups {
		// Bỏ qua những file đã được upload
		if backup.Uploaded {
			fmt.Printf("File %s đã được upload trước đó, bỏ qua\n", backup.Name)
			skippedCount++
			continue
		}

		// Kiểm tra file có tồn tại không
		_, err := os.Stat(backup.Path)
		if os.IsNotExist(err) {
			fmt.Printf("File %s không còn tồn tại trên filesystem, bỏ qua\n", backup.Path)
			skippedCount++
			continue
		}

		// Xác định tên thư mục ngày từ đường dẫn file
		dirPath := filepath.Dir(backup.Path)
		dateFolder := filepath.Base(dirPath)

		// Tạo hoặc lấy folder ngày trên Drive nếu chưa có
		dateFolderID, exists := dateFolders[dateFolder]
		if !exists {
			dateFolderID, err = d.createOrFindFolder(dateFolder, rootFolderID)
			if err != nil {
				fmt.Printf("Không thể tạo folder ngày %s: %v\n", dateFolder, err)
				failCount++
				continue
			}
			dateFolders[dateFolder] = dateFolderID
		}

		// Kiểm tra file đã tồn tại trên Drive chưa
		existingFile, err := d.checkFileExists(backup.Name, dateFolderID)
		if err != nil {
			fmt.Printf("Không thể kiểm tra file %s: %v\n", backup.Name, err)
			failCount++
			continue
		}

		if existingFile != nil {
			fmt.Printf("File %s đã tồn tại trên Drive, bỏ qua\n", backup.Name)

			// Tạo webLink
			webLink := fmt.Sprintf("https://drive.google.com/file/d/%s/view", existingFile.Id)

			// Cập nhật trạng thái trong database
			var backupID int64
			fmt.Sscanf(backup.ID, "%d", &backupID)
			if err := backupdb.UpdateBackupUploadStatus(backupID, true, webLink); err != nil {
				fmt.Printf("Không thể cập nhật trạng thái file %s: %v\n", backup.Name, err)
			}

			skippedCount++
			continue
		}

		// Mở file để upload
		content, err := os.Open(backup.Path)
		if err != nil {
			fmt.Printf("Không thể mở file %s: %v\n", backup.Path, err)
			failCount++
			continue
		}

		// Chuẩn bị metadata
		fileMetadata := &drive.File{
			Name:    backup.Name,
			Parents: []string{dateFolderID},
		}

		// Upload file với retry
		var file *drive.File
		maxRetries := 3
		for attempt := 1; attempt <= maxRetries; attempt++ {
			// Upload file
			file, err = d.service.Files.Create(fileMetadata).
				Media(content).
				Fields("id").
				Do()

			if err == nil {
				break // Thành công, thoát khỏi vòng lặp
			}

			// Lỗi, thử lại nếu còn lượt
			if attempt < maxRetries {
				fmt.Printf("Lỗi khi upload file %s (lần thử %d/%d): %v. Đang thử lại...\n",
					backup.Name, attempt, maxRetries, err)
				time.Sleep(time.Second * 2) // Đợi 2 giây trước khi thử lại

				// Đặt lại vị trí đọc file
				content.Seek(0, 0)
			}
		}
		content.Close()

		if err != nil {
			fmt.Printf("Không thể upload file %s sau %d lần thử: %v\n", backup.Name, maxRetries, err)
			failCount++
			continue
		}

		fmt.Printf("Đã upload file %s (ID: %s)\n", backup.Name, file.Id)
		successCount++

		// Tạo webLink
		webLink := fmt.Sprintf("https://drive.google.com/file/d/%s/view", file.Id)

		// Cập nhật trạng thái trong database
		var backupID int64
		fmt.Sscanf(backup.ID, "%d", &backupID)
		if err := backupdb.UpdateBackupUploadStatus(backupID, true, webLink); err != nil {
			fmt.Printf("Không thể cập nhật trạng thái file %s: %v\n", backup.Name, err)
		}
	}

	// Trả về thông tin tổng kết
	if failCount > 0 {
		return fmt.Errorf("upload không hoàn toàn thành công: %d thành công, %d thất bại, %d bỏ qua",
			successCount, failCount, skippedCount)
	}

	if successCount == 0 && skippedCount > 0 {
		return fmt.Errorf("không có file nào được upload: %d file đã bỏ qua vì đã upload trước đó hoặc không tồn tại",
			skippedCount)
	}

	return nil
}

// Thêm struct UploadResult để trả về kết quả upload
type UploadResult struct {
	Success  bool   `json:"success"`
	FileID   string `json:"file_id,omitempty"`
	FileName string `json:"file_name,omitempty"`
	WebLink  string `json:"web_link,omitempty"`
	Message  string `json:"message"`
}
