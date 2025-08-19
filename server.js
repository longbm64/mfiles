const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types'); // Thêm mime-types để xử lý MIME type chính xác

const app = express();
const PORT = process.env.PORT || 9100;

// Cấu hình đường dẫn bệnh án gốc - chỉ cần thay đổi ở đây
const BASE_DIR = './list-f';

// Cấu hình EJS template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cấu hình static files với MIME type chính xác
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        // Sử dụng mime-types để đặt MIME type chính xác
        const mimeType = mime.lookup(filePath);
        if (mimeType) {
            res.setHeader('Content-Type', mimeType);
        }
        
        // Đặt MIME type cụ thể cho các file quan trọng
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.css':
                res.setHeader('Content-Type', 'text/css; charset=utf-8');
                break;
            case '.js':
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                break;
            case '.json':
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                break;
        }
        
        // Đặt cache control cho static files
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 năm
        
        // Thêm security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// Middleware để đảm bảo MIME type chính xác cho assets
app.use('/assets', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    
    // Force set MIME type cho các file quan trọng
    switch (ext) {
        case '.css':
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            break;
        case '.js':
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            break;
    }
    
    next();
});

// Route fallback cho CSS nếu static middleware không hoạt động
app.get('/assets/css/style.css', (req, res) => {
    const cssPath = path.join(__dirname, 'public', 'assets', 'css', 'style.css');
    
    try {
        if (fs.existsSync(cssPath)) {
            const cssContent = fs.readFileSync(cssPath, 'utf8');
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.send(cssContent);
        } else {
            res.status(404).send('/* CSS file not found */');
        }
    } catch (error) {
        console.error('Error serving CSS:', error);
        res.status(500).send('/* Error loading CSS */');
    }
});

// Route để phục vụ file PDF
app.get('/file/*', (req, res) => {
    const relativePath = req.params[0]; // Lấy đường dẫn tương đối từ URL
    const fullPath = path.join(BASE_DIR, relativePath);

    try {
        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(fullPath)) {
            return res.status(404).send('File không tồn tại');
        }

        // Kiểm tra có phải file không (không phải bệnh án)
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            return res.status(400).send('Đường dẫn không phải là file');
        }

        // Kiểm tra extension file có hợp lệ không (chỉ cho phép PDF)
        const ext = path.extname(fullPath).toLowerCase();
        if (ext !== '.pdf') {
            return res.status(403).send('Chỉ được phép truy cập file PDF');
        }

        // Đặt header cho PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);

        // Gửi file
        res.sendFile(fullPath);

    } catch (error) {
        console.error('Lỗi khi phục vụ file:', error);
        res.status(500).send('Lỗi server khi đọc file');
    }
});

/**
 * Hàm đệ quy để scan cấu trúc bệnh án
 * @param {string} dirPath - Đường dẫn bệnh án cần scan
 * @param {number} depth - Độ sâu hiện tại (để tránh scan quá sâu)
 * @param {string} baseDir - Bệnh án gốc để tính relative path
 * @returns {Object} Cấu trúc bệnh án dưới dạng object
 */
function scanDirectory(dirPath, depth = 0, baseDir = null) {
    const maxDepth = 10; // Giới hạn độ sâu để tránh infinite loop

    if (depth > maxDepth) {
        return null;
    }

    // Nếu baseDir chưa được set, sử dụng BASE_DIR làm baseDir
    if (!baseDir) {
        baseDir = BASE_DIR;
    }

    try {
        const stats = fs.statSync(dirPath);
        const name = path.basename(dirPath);

        if (stats.isDirectory()) {
            const children = [];
            const items = fs.readdirSync(dirPath);

            // Sắp xếp: bệnh án trước, file sau
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
                const childNode = scanDirectory(itemPath, depth + 1, baseDir);
                if (childNode) {
                    children.push(childNode);
                }
            });

            return {
                name: name,
                type: 'directory',
                path: dirPath,
                relativePath: path.relative(baseDir, dirPath),
                children: children,
                size: children.length
            };
        } else {
            return {
                name: name,
                type: 'file',
                path: dirPath,
                relativePath: path.relative(baseDir, dirPath),
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
    const folderName = req.query.folder ? req.query.folder.trim() : '';

    let directoryStructure = null;
    let error = null;
    let searchPath = null;

    // Validation input
    if (folderName && (folderName.length > 50 || /[<>:"/\\|?*]/.test(folderName))) {
        error = 'Tên bệnh án không hợp lệ. Vui lòng không sử dụng ký tự đặc biệt và giới hạn dưới 50 ký tự.';
    }

    // Nếu có tham số folder, tìm kiếm folder đó
    if (folderName && !error) {
        try {
            searchPath = findFolderPath(BASE_DIR, folderName);

            if (searchPath) {
                directoryStructure = scanDirectory(searchPath);

                // Kiểm tra nếu bệnh án rỗng
                if (!directoryStructure.children || directoryStructure.children.length === 0) {
                    error = `Bệnh án "${folderName}" tồn tại nhưng không có nội dung hoặc bạn không có quyền truy cập.`;
                    directoryStructure = null;
                }
            } else {
                error = `Không tìm thấy folder "${folderName}" trong bệnh án gốc. Vui lòng kiểm tra lại tên bệnh án.`;
            }
        } catch (err) {
            console.error('Lỗi khi tìm kiếm folder:', err);

            let errorMessage = 'Lỗi không xác định khi tìm kiếm bệnh án.';

            if (err.code === 'EACCES') {
                errorMessage = 'Không có quyền truy cập vào bệnh án này.';
            } else if (err.code === 'ENOENT') {
                errorMessage = 'Bệnh án không tồn tại hoặc đã bị xóa.';
            } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
                errorMessage = 'Hệ thống đang quá tải. Vui lòng thử lại sau.';
            }

            error = errorMessage;
        }
    }

    res.render('index', {
        title: 'QUẢN LÝ BỆNH ÁN',
        baseDir: BASE_DIR,
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
                        console.log(`Không có quyền truy cập bệnh án: ${itemPath}`);
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
            error: 'Tên bệnh án không hợp lệ',
            code: 'INVALID_FOLDER_NAME'
        });
    }

    try {
        const searchPath = findFolderPath(BASE_DIR, folderName);

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
                warning: 'Bệnh án rỗng hoặc không có quyền truy cập nội dung'
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
        let errorMessage = 'Lỗi không xác định khi đọc bệnh án';

        if (error.code === 'EACCES') {
            errorCode = 'ACCESS_DENIED';
            errorMessage = 'Không có quyền truy cập vào bệnh án';
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
    console.log(`📁 Đang quản lý bệnh án: ${BASE_DIR}`);
});

module.exports = app;