// Admin functionality for authentication and file uploads
class AdminManager {
    constructor() {
        this.isLoggedIn = false;
        this.githubToken = null;
        this.repoOwner = 'SHAHMEERHACKER101';
        this.repoName = 'portfolio-files';
        this.apiBase = 'https://api.github.com';
        
        // Make adminManager globally accessible
        window.adminManager = this;
        
        this.initEventListeners();
    }

    initEventListeners() {
        // Admin button click
        document.getElementById('adminBtn').addEventListener('click', () => {
            if (this.isLoggedIn) {
                this.showAdminPanel();
            } else {
                this.showLoginModal();
            }
        });

        // Login form submit
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Upload form submit
        document.getElementById('uploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFileUpload();
        });

        // Save token button
        document.getElementById('saveTokenBtn').addEventListener('click', () => {
            this.saveGitHubToken();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Modal close button
        document.querySelector('.close').addEventListener('click', () => {
            this.hideLoginModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('loginModal');
            if (e.target === modal) {
                this.hideLoginModal();
            }
        });
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
        // Clear form
        document.getElementById('loginForm').reset();
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Verify credentials
        if (username === 'shahmeer606' && password === '9MJMKHmjfP695IW') {
            this.isLoggedIn = true;
            this.githubToken = null; // Will be set when user provides token
            
            this.hideLoginModal();
            this.showAdminPanel();
            this.updateAdminButton();
            this.showNotification('Login successful! Please enter your GitHub token to upload files.', 'success');
            
            // Update admin view to show delete buttons
            if (window.app) {
                window.app.updateAdminView();
            }
        } else {
            this.showNotification('Invalid credentials!', 'error');
        }
    }

    showAdminPanel() {
        document.getElementById('adminPanel').style.display = 'block';
        // Scroll to admin panel
        document.getElementById('adminPanel').scrollIntoView({ behavior: 'smooth' });
    }

    hideAdminPanel() {
        document.getElementById('adminPanel').style.display = 'none';
    }

    updateAdminButton() {
        const adminBtn = document.getElementById('adminBtn');
        if (this.isLoggedIn) {
            adminBtn.innerHTML = '<i class="fas fa-user-check"></i> Admin Panel';
            adminBtn.style.background = 'linear-gradient(45deg, #4ecdc4 0%, #44a08d 100%)';
        } else {
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
            adminBtn.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
        }
    }

    saveGitHubToken() {
        const tokenInput = document.getElementById('githubToken');
        const token = tokenInput.value.trim();
        
        if (!token) {
            this.showNotification('Please enter your GitHub token!', 'error');
            return;
        }
        
        this.githubToken = token;
        
        // Hide token setup and show upload form
        document.getElementById('tokenSetup').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'block';
        
        this.showNotification('GitHub token saved! You can now upload files.', 'success');
        
        // Update admin view to show delete buttons
        if (window.app) {
            window.app.updateAdminView();
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.githubToken = null;
        
        // Reset admin panel view
        document.getElementById('tokenSetup').style.display = 'block';
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('githubToken').value = '';
        
        this.hideAdminPanel();
        this.updateAdminButton();
        this.showNotification('Logged out successfully!', 'success');
        
        // Update admin view to hide delete buttons
        if (window.app) {
            window.app.updateAdminView();
        }
    }

    async handleFileUpload() {
        const fileTitle = document.getElementById('fileTitle').value.trim();
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('Please select a file!', 'error');
            return;
        }

        if (!fileTitle) {
            this.showNotification('Please enter a file title!', 'error');
            return;
        }

        const uploadBtn = document.getElementById('uploadBtn');
        const uploadStatus = document.getElementById('uploadStatus');

        try {
            // Show loading state
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            uploadStatus.className = 'upload-status loading';
            
            if (file.size > 50 * 1024 * 1024) {
                uploadStatus.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Preparing large file upload (this may take longer)...';
            } else {
                uploadStatus.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Preparing file upload...';
            }

            // Convert file to base64 using proper method for large files
            const base64Content = await this.fileToBase64(file);
            
            uploadStatus.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Uploading to GitHub...';

            // Generate filename with timestamp to avoid conflicts
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileExtension = file.name.split('.').pop();
            const safeFileName = this.sanitizeFilename(fileTitle);
            const fileName = `${safeFileName}-${timestamp}.${fileExtension}`;
            const filePath = `uploads/${fileName}`;

            // Upload file to GitHub (with large file support)
            await this.uploadToGitHub(filePath, base64Content, `Add ${fileTitle}`, file.size);

            uploadStatus.innerHTML = '<i class="fas fa-list"></i> Updating file list...';

            // Update files.json
            await this.updateFilesList({
                title: fileTitle,
                file: filePath,
                type: fileExtension.toLowerCase(),
                size: this.formatFileSize(file.size),
                uploadDate: new Date().toISOString()
            });

            // Success state
            uploadStatus.className = 'upload-status success';
            uploadStatus.innerHTML = '<i class="fas fa-check-circle"></i> File uploaded successfully!';
            
            // Reset form
            document.getElementById('uploadForm').reset();
            
            // Refresh file list
            if (window.app) {
                await window.app.refresh();
            }

            this.showNotification('File uploaded successfully!', 'success');

        } catch (error) {
            console.error('Upload error:', error);
            uploadStatus.className = 'upload-status error';
            uploadStatus.innerHTML = `<i class="fas fa-exclamation-circle"></i> Upload failed: ${error.message}`;
            this.showNotification(`Upload failed: ${error.message}`, 'error');
        } finally {
            // Reset button state
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload File';
        }
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    // Convert ArrayBuffer to Uint8Array then to Base64
                    const arrayBuffer = reader.result;
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    // Convert to base64 in chunks to handle large files
                    let binary = '';
                    const chunkSize = 8192;
                    
                    for (let i = 0; i < uint8Array.length; i += chunkSize) {
                        const chunk = uint8Array.slice(i, i + chunkSize);
                        binary += String.fromCharCode.apply(null, chunk);
                    }
                    
                    const base64 = btoa(binary);
                    resolve(base64);
                } catch (error) {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            // Use readAsArrayBuffer to avoid btoa issues with binary data
            reader.readAsArrayBuffer(file);
        });
    }

    async uploadToGitHub(path, content, message, fileSize) {
        // For files larger than 50MB, use a different approach
        if (fileSize > 50 * 1024 * 1024) { // 50MB
            return await this.uploadLargeFileToGitHub(path, content, message);
        }
        
        const url = `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                content: content,
                branch: 'main'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload to GitHub');
        }

        return response.json();
    }

    async uploadLargeFileToGitHub(path, content, message) {
        try {
            // For large files, we'll use the Git Trees API
            // First, create a blob
            const blobResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/git/blobs`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    encoding: 'base64'
                })
            });

            if (!blobResponse.ok) {
                const errorData = await blobResponse.json();
                throw new Error(errorData.message || 'Failed to create blob');
            }

            const blobData = await blobResponse.json();

            // Get the current commit SHA
            const refResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/git/refs/heads/main`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                }
            });

            if (!refResponse.ok) {
                throw new Error('Failed to get current commit');
            }

            const refData = await refResponse.json();
            const currentCommitSha = refData.object.sha;

            // Get the current tree
            const commitResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/git/commits/${currentCommitSha}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                }
            });

            if (!commitResponse.ok) {
                throw new Error('Failed to get current commit');
            }

            const commitData = await commitResponse.json();
            const currentTreeSha = commitData.tree.sha;

            // Create a new tree with the new file
            const treeResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/git/trees`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    base_tree: currentTreeSha,
                    tree: [{
                        path: path,
                        mode: '100644',
                        type: 'blob',
                        sha: blobData.sha
                    }]
                })
            });

            if (!treeResponse.ok) {
                const errorData = await treeResponse.json();
                throw new Error(errorData.message || 'Failed to create tree');
            }

            const treeData = await treeResponse.json();

            // Create a new commit
            const newCommitResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/git/commits`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    tree: treeData.sha,
                    parents: [currentCommitSha]
                })
            });

            if (!newCommitResponse.ok) {
                const errorData = await newCommitResponse.json();
                throw new Error(errorData.message || 'Failed to create commit');
            }

            const newCommitData = await newCommitResponse.json();

            // Update the reference
            const updateRefResponse = await fetch(`${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/git/refs/heads/main`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sha: newCommitData.sha
                })
            });

            if (!updateRefResponse.ok) {
                const errorData = await updateRefResponse.json();
                throw new Error(errorData.message || 'Failed to update reference');
            }

            return newCommitData;

        } catch (error) {
            throw new Error(`Large file upload failed: ${error.message}`);
        }
    }

    async updateFilesList(newFile) {
        try {
            // First, try to get existing files.json
            let existingFiles = [];
            const filesUrl = `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/data/files.json`;
            
            try {
                const response = await fetch(filesUrl, {
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                    }
                });
                
                if (response.ok) {
                    const fileData = await response.json();
                    const content = atob(fileData.content.replace(/\s/g, ''));
                    existingFiles = JSON.parse(content);
                    
                    // Add new file to existing list
                    existingFiles.push(newFile);
                    
                    // Update existing file
                    await fetch(filesUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${this.githubToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: `Update files.json - add ${newFile.title}`,
                            content: btoa(JSON.stringify(existingFiles, null, 2)),
                            sha: fileData.sha,
                            branch: 'main'
                        })
                    });
                } else {
                    throw new Error('files.json not found');
                }
            } catch (error) {
                // Create new files.json if it doesn't exist
                existingFiles = [newFile];
                
                await fetch(filesUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `Create files.json with ${newFile.title}`,
                        content: btoa(JSON.stringify(existingFiles, null, 2)),
                        branch: 'main'
                    })
                });
            }
        } catch (error) {
            throw new Error(`Failed to update files list: ${error.message}`);
        }
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async deleteFile(filePath, fileName) {
        if (!this.githubToken) {
            this.showNotification('Please set your GitHub token first!', 'error');
            return;
        }

        // Confirm deletion
        if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            this.showNotification('Deleting file...', 'loading');

            // Get file SHA for deletion
            const fileUrl = `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${filePath}`;
            const fileResponse = await fetch(fileUrl, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                }
            });

            if (!fileResponse.ok) {
                throw new Error('File not found or cannot be accessed');
            }

            const fileData = await fileResponse.json();

            // Delete the file from GitHub
            const deleteResponse = await fetch(fileUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Delete ${fileName}`,
                    sha: fileData.sha,
                    branch: 'main'
                })
            });

            if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json();
                throw new Error(errorData.message || 'Failed to delete file from GitHub');
            }

            // Update files.json to remove the entry
            await this.removeFromFilesList(filePath);

            // Refresh the file list
            if (window.app) {
                await window.app.refresh();
            }

            this.showNotification(`"${fileName}" deleted successfully!`, 'success');

        } catch (error) {
            console.error('Delete error:', error);
            this.showNotification(`Failed to delete file: ${error.message}`, 'error');
        }
    }

    async removeFromFilesList(filePath) {
        try {
            // Get existing files.json
            const filesUrl = `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/data/files.json`;
            
            const response = await fetch(filesUrl, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                }
            });

            if (!response.ok) {
                throw new Error('Could not fetch files.json');
            }

            const fileData = await response.json();
            const content = atob(fileData.content.replace(/\s/g, ''));
            let existingFiles = JSON.parse(content);

            // Remove the file from the list
            existingFiles = existingFiles.filter(file => file.file !== filePath);

            // Update files.json
            await fetch(filesUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Remove deleted file from files.json`,
                    content: btoa(JSON.stringify(existingFiles, null, 2)),
                    sha: fileData.sha,
                    branch: 'main'
                })
            });

        } catch (error) {
            throw new Error(`Failed to update files list: ${error.message}`);
        }
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'loading' ? 'spinner fa-spin' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'loading' ? 'rgba(255, 193, 7, 0.9)' : 'rgba(244, 67, 54, 0.9)'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1001;
            font-weight: 600;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid ${type === 'success' ? '#4caf50' : type === 'loading' ? '#ffc107' : '#f44336'};
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds (unless it's loading)
        if (type !== 'loading') {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            document.body.removeChild(notification);
                        }
                    }, 300);
                }
            }, 4000);
        }
    }
}

// Initialize admin manager
const adminManager = new AdminManager();

// Add CSS for slide out animation
const adminStyles = document.createElement('style');
adminStyles.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(adminStyles);
