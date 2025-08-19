const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 9100;

// Cấu hình EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình static files
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Hàm đệ quy để scan cấu trúc thư mục
 * @param {string} dirPath - Đường dẫn thư mục cần scan
 * @param {number} depth - Độ sâu hiện tại (để tránh scan quá sâu)
 * @returns {Object} Cấu trúc thư mục dưới dạng object
 */
function scanDirectory(dirPath, depth = 0) {
    const maxDepth = 10; // Giới hạn độ sâu để tránh infinite loop
    
    if (depth > maxDepth) {
        return null;
    }
    
    try {
        const stats = fs.statSync(dirPath);
        const name = path.basename(dirPath);
        
        if (stats.isDirectory()) {
            const children = [];
            const items = fs.readdirSync(dirPath);
            
            // Sắp xếp: thư mục trước, file sau
            items.sort((a, b) => {
                const aPath = path.join(dirPath, a);
                const bPath = path.join(dirPath, b);
                const aIsDir = fs.statSync(aPath).isDirectory();
                const bIsDir = fs.statSync(bPath).isDirectory();
                
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });
            
            items.forEach(item => {
                const itemPath = path.join(dirPath, item);
                const childNode = scanDirectory(itemPath, depth + 1);
                if (childNode) {
                    children.push(childNode);
                }
            });
            
            return {
                name: name,
                type: 'directory',
                path: dirPath,
                children: children,
                size: children.length
            };
        } else {
            return {
                name: name,
                type: 'file',
                path: dirPath,
                size: stats.size,
                modified: stats.mtime
            };
        }
    } catch (error) {
        console.error(`Lỗi khi scan ${dirPath}:`, error.message);
        return null;
    }
}

// Route chính để hiển thị form tìm kiếm và kết quả
app.get('/', (req, res) => {
    const baseDir = '/Users/DangLong/apps/mfiles/list-f';
    const folderName = req.query.folder ? req.query.folder.trim() : '';
    
    let directoryStructure = null;
    let error = null;
    let searchPath = null;
    
    // Validation input
    if (folderName && (folderName.length > 50 || /[<>:"/\\|?*]/.test(folderName))) {
        error = 'Tên thư mục không hợp lệ. Vui lòng không sử dụng ký tự đặc biệt và giới hạn dưới 50 ký tự.';
    }
    
    // Nếu có tham số folder, tìm kiếm folder đó
    if (folderName && !error) {
        try {
            searchPath = findFolderPath(baseDir, folderName);
            
            if (searchPath) {
                directoryStructure = scanDirectory(searchPath);
                
                // Kiểm tra nếu thư mục rỗng
                if (!directoryStructure.children || directoryStructure.children.length === 0) {
                    error = `Thư mục "${folderName}" tồn tại nhưng không có nội dung hoặc bạn không có quyền truy cập.`;
                    directoryStructure = null;
                }
            } else {
                error = `Không tìm thấy folder "${folderName}" trong thư mục gốc. Vui lòng kiểm tra lại tên thư mục.`;
            }
        } catch (err) {
            console.error('Lỗi khi tìm kiếm folder:', err);
            
            let errorMessage = 'Lỗi không xác định khi tìm kiếm thư mục.';
            
            if (err.code === 'EACCES') {
                errorMessage = 'Không có quyền truy cập vào thư mục này.';
            } else if (err.code === 'ENOENT') {
                errorMessage = 'Thư mục không tồn tại hoặc đã bị xóa.';
            } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
                errorMessage = 'Hệ thống đang quá tải. Vui lòng thử lại sau.';
            }
            
            error = errorMessage;
        }
    }
    
    res.render('index', {
        title: 'Quản lý thư mục',
        baseDir: baseDir,
        folderName: folderName || '',
        searchPath: searchPath,
        structure: directoryStructure,
        error: error
    });
});

/**
 * Tìm kiếm đường dẫn của folder theo tên
 * @param {string} baseDir - Thư mục gốc để tìm kiếm
 * @param {string} folderName - Tên folder cần tìm
 * @returns {string|null} Đường dẫn đầy đủ của folder hoặc null nếu không tìm thấy
 */
function findFolderPath(baseDir, folderName) {
    try {
        // Kiểm tra baseDir có tồn tại không
        if (!fs.existsSync(baseDir)) {
            return null;
        }
        
        const items = fs.readdirSync(baseDir);
        
        for (const item of items) {
            const itemPath = path.join(baseDir, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                // Kiểm tra tên folder có khớp không (case-insensitive)
                if (item.toLowerCase() === folderName.toLowerCase()) {
                    // Kiểm tra quyền truy cập
                    try {
                        fs.accessSync(itemPath, fs.constants.R_OK);
                        return itemPath;
                    } catch (accessError) {
                        console.log(`Không có quyền truy cập thư mục: ${itemPath}`);
                        return null;
                    }
                }
                
                // Tìm kiếm đệ quy trong các thư mục con
                const foundPath = findFolderPath(itemPath, folderName);
                if (foundPath) {
                    return foundPath;
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error(`Lỗi khi tìm kiếm trong ${baseDir}:`, error.message);
        return null;
    }
}

// Route API để lấy thông tin thư mục dưới dạng JSON
app.get('/api/directory', (req, res) => {
    const baseDir = '/Users/DangLong/apps/mfiles/list-f';
    const folderName = req.query.folder ? req.query.folder.trim() : '';
    
    // Validation
    if (!folderName) {
        return res.status(400).json({
            success: false,
            error: 'Vui lòng cung cấp tên folder',
            code: 'MISSING_FOLDER_PARAM'
        });
    }
    
    if (folderName.length > 50 || /[<>:"/\\|?*]/.test(folderName)) {
        return res.status(400).json({
            success: false,
            error: 'Tên thư mục không hợp lệ',
            code: 'INVALID_FOLDER_NAME'
        });
    }
    
    try {
        const searchPath = findFolderPath(baseDir, folderName);
        
        if (!searchPath) {
            return res.status(404).json({
                success: false,
                error: `Không tìm thấy folder "${folderName}"`,
                code: 'FOLDER_NOT_FOUND',
                folderName: folderName
            });
        }
        
        const directoryStructure = scanDirectory(searchPath);
        
        if (!directoryStructure.children || directoryStructure.children.length === 0) {
            return res.status(200).json({
                success: true,
                data: directoryStructure,
                path: searchPath,
                warning: 'Thư mục rỗng hoặc không có quyền truy cập nội dung'
            });
        }
        
        res.json({
            success: true,
            data: directoryStructure,
            path: searchPath
        });
    } catch (error) {
        console.error('Lỗi API:', error);
        
        let errorCode = 'UNKNOWN_ERROR';
        let errorMessage = 'Lỗi không xác định khi đọc thư mục';
        
        if (error.code === 'EACCES') {
            errorCode = 'ACCESS_DENIED';
            errorMessage = 'Không có quyền truy cập vào thư mục';
        } else if (error.code === 'ENOENT') {
            errorCode = 'PATH_NOT_FOUND';
            errorMessage = 'Đường dẫn không tồn tại';
        } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
            errorCode = 'SYSTEM_OVERLOAD';
            errorMessage = 'Hệ thống quá tải';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            code: errorCode,
            folderName: folderName
        });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📁 Đang quản lý thư mục: /Users/DangLong/apps/mfiles/list-f`);
});

module.exports = app;