// Main application logic for file listing and downloads
class FileHostingApp {
    constructor() {
        this.repoOwner = 'SHAHMEERHACKER101';
        this.repoName = 'portfolio-files';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/main`;
        this.filesData = [];
        
        this.init();
    }

    async init() {
        await this.loadFiles();
        this.renderFiles();
        this.updateAdminView();
    }

    async loadFiles() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const filesList = document.getElementById('filesList');
        const emptyState = document.getElementById('emptyState');

        try {
            loadingSpinner.style.display = 'block';
            filesList.style.display = 'none';
            emptyState.style.display = 'none';

            // First try to get files from files.json
            let filesFromJson = [];
            try {
                const timestamp = new Date().getTime();
                const response = await fetch(`${this.baseUrl}/data/files.json?t=${timestamp}`);
                if (response.ok) {
                    const data = await response.json();
                    filesFromJson = Array.isArray(data) ? data : [];
                }
            } catch (error) {
                console.log('files.json not found, will scan uploads folder');
            }

            // Also scan the uploads folder directly to catch any missing files
            let filesFromUploads = [];
            try {
                const uploadsResponse = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/uploads`);
                if (uploadsResponse.ok) {
                    const uploadsData = await uploadsResponse.json();
                    filesFromUploads = uploadsData
                        .filter(item => item.type === 'file')
                        .map(file => {
                            // Extract title from filename (remove timestamp and extension)
                            const fileName = file.name;
                            const title = this.extractTitleFromFilename(fileName);
                            const extension = fileName.split('.').pop().toLowerCase();
                            
                            return {
                                title: title,
                                file: file.path,
                                type: extension,
                                size: this.formatFileSize(file.size),
                                uploadDate: new Date().toISOString()
                            };
                        });
                }
            } catch (error) {
                console.log('Could not scan uploads folder:', error);
            }

            // Combine and deduplicate files (prioritize files.json data for titles)
            const allFiles = new Map();
            
            // Add files from uploads folder first
            filesFromUploads.forEach(file => {
                allFiles.set(file.file, file);
            });
            
            // Override with files.json data (better titles)
            filesFromJson.forEach(file => {
                allFiles.set(file.file, file);
            });

            this.filesData = Array.from(allFiles.values());

            loadingSpinner.style.display = 'none';
            
            if (this.filesData.length === 0) {
                emptyState.style.display = 'block';
            } else {
                filesList.style.display = 'grid';
            }

        } catch (error) {
            console.error('Error loading files:', error);
            loadingSpinner.style.display = 'none';
            emptyState.style.display = 'block';
            this.filesData = [];
        }
    }

    extractTitleFromFilename(filename) {
        // Remove extension
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        // Remove timestamp pattern (YYYY-MM-DDTHH-MM-SS-SSSZ)
        const withoutTimestamp = nameWithoutExt.replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/, '');
        
        // Replace dashes with spaces and capitalize
        return withoutTimestamp
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    renderFiles() {
        const filesList = document.getElementById('filesList');
        
        if (this.filesData.length === 0) {
            return;
        }

        filesList.innerHTML = this.filesData.map(file => {
            const fileType = this.getFileType(file.file);
            const fileIcon = this.getFileIcon(fileType);
            const downloadUrl = this.getDownloadUrl(file.file);
            
            return `
                <div class="file-item" data-file-path="${file.file}">
                    <div class="file-header">
                        <div class="file-icon ${fileType}">
                            <i class="${fileIcon}"></i>
                        </div>
                        <div class="file-info">
                            <h3>${this.escapeHtml(file.title)}</h3>
                        </div>
                    </div>
                    <div class="file-meta">
                        <span><i class="fas fa-file"></i> ${fileType.toUpperCase()}</span>
                        <span><i class="fas fa-hdd"></i> ${file.size || 'Unknown size'}</span>
                    </div>
                    <div class="file-actions">
                        <button class="btn btn-download" onclick="app.downloadFile('${downloadUrl}', '${this.escapeHtml(file.title)}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn btn-delete admin-only" onclick="adminManager.deleteFile('${file.file}', '${this.escapeHtml(file.title)}')" style="display: none;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update admin view after rendering
        this.updateAdminView();
    }

    getFileType(filename) {
        const extension = filename.toLowerCase().split('.').pop();
        const typeMap = {
            'pdf': 'pdf',
            'docx': 'docx',
            'doc': 'docx',
            'mp4': 'mp4',
            'mov': 'mp4',
            'avi': 'mp4',
            'pptx': 'pptx',
            'ppt': 'pptx',
            'xlsx': 'xlsx',
            'xls': 'xlsx',
            'txt': 'default'
        };
        return typeMap[extension] || 'default';
    }

    getFileIcon(fileType) {
        const iconMap = {
            'pdf': 'fas fa-file-pdf',
            'docx': 'fas fa-file-word',
            'mp4': 'fas fa-file-video',
            'pptx': 'fas fa-file-powerpoint',
            'xlsx': 'fas fa-file-excel',
            'default': 'fas fa-file'
        };
        return iconMap[fileType] || 'fas fa-file';
    }

    getDownloadUrl(filePath) {
        // Encode the file path properly for URLs
        const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
        return `${this.baseUrl}/${encodedPath}`;
    }

    downloadFile(url, filename) {
        try {
            // Create a temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show download success message
            this.showNotification('Download started successfully!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showNotification('Download failed. Please try again.', 'error');
        }
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: 600;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid ${type === 'success' ? '#4caf50' : '#f44336'};
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Method to refresh the file list (called after upload)
    async refresh() {
        await this.loadFiles();
        this.renderFiles();
        this.updateAdminView();
    }

    // Show/hide admin elements based on login status
    updateAdminView() {
        const adminElements = document.querySelectorAll('.admin-only');
        const isAdminLoggedIn = window.adminManager && window.adminManager.isLoggedIn && window.adminManager.githubToken;
        
        console.log('Updating admin view:', {
            hasAdminManager: !!window.adminManager,
            isLoggedIn: window.adminManager ? window.adminManager.isLoggedIn : false,
            hasToken: window.adminManager ? !!window.adminManager.githubToken : false,
            willShowButtons: isAdminLoggedIn
        });
        
        adminElements.forEach(element => {
            element.style.display = isAdminLoggedIn ? 'inline-flex' : 'none';
        });
    }
}

// Initialize the application
const app = new FileHostingApp();

// Add refresh button functionality
document.getElementById('refreshBtn').addEventListener('click', () => {
    app.refresh();
    app.showNotification('Refreshing file list...', 'success');
});

// Update admin view when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        setTimeout(() => {
            window.app.updateAdminView();
        }, 500);
    }
});

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(notificationStyles);
