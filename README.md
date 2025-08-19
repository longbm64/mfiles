# Ứng dụng Quản lý Bệnh án

Ứng dụng web đơn giản để quản lý và hiển thị cấu trúc bệnh án `/Users/DangLong/apps/mfiles/list-f` sử dụng Node.js + Express + EJS.

## Tính năng

- 📁 Hiển thị cấu trúc bệnh án dưới dạng tree view
- 🔍 Scan và hiển thị tất cả file và folder
- 📊 Thống kê số lượng bệnh án, file và tổng dung lượng
- 🎯 Tương tác expand/collapse bệnh án với animation mượt
- ⌨️ Hỗ trợ phím tắt
- 📱 Giao diện responsive với Bootstrap 5

## Cài đặt

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Khởi chạy ứng dụng:**
   ```bash
   npm start
   # hoặc cho development với auto-reload
   npm run dev
   ```

3. **Truy cập ứng dụng:**
   Mở trình duyệt và truy cập: `http://localhost:3000`

## Cấu trúc dự án

```
/
├── server.js              # Server chính
├── package.json           # Dependencies và scripts
├── views/                 # EJS templates
│   ├── index.ejs         # Template chính
│   └── partials/
│       └── tree-node.ejs # Template cho từng node
└── public/               # Static files
    └── assets/
        ├── css/
        │   └── style.css # Custom CSS
        └── js/
            └── tree-view.js # JavaScript cho tree view
```

## Phím tắt

- `Ctrl + E` (hoặc `Cmd + E` trên Mac): Mở rộng tất cả bệnh án
- `Ctrl + C` (hoặc `Cmd + C` trên Mac): Thu gọn tất cả bệnh án  
- `Ctrl + R` (hoặc `Cmd + R` trên Mac): Làm mới trang

## API Endpoints

- `GET /` - Trang chính hiển thị tree view
- `GET /api/directory` - API trả về cấu trúc bệnh án dưới dạng JSON

## Công nghệ sử dụng

- **Backend:** Node.js, Express.js
- **Template Engine:** EJS
- **Frontend:** Bootstrap 5, Vanilla JavaScript
- **Icons:** Bootstrap Icons

## Tính năng nâng cao

- Animation mượt mà khi expand/collapse
- Hover effects và visual feedback
- Responsive design cho mobile
- Loading states và error handling
- File size formatting (B, KB, MB, GB)
- Statistics với counter animation

## Lưu ý

- Ứng dụng được cấu hình để scan bệnh án `/Users/DangLong/apps/mfiles/list-f`
- Có giới hạn độ sâu scan (10 levels) để tránh infinite loop
- Hỗ trợ sắp xếp: bệnh án trước, file sau, theo alphabet

## Development

Để phát triển thêm tính năng:

1. Sửa đổi `server.js` cho backend logic
2. Cập nhật templates trong `views/` cho UI
3. Thêm styles trong `public/assets/css/style.css`
4. Mở rộng JavaScript trong `public/assets/js/tree-view.js`

## License

MIT License