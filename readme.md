# 📚 Flashcard Backend

Đây là mã nguồn backend cho ứng dụng Flashcard hỗ trợ người dùng học từ vựng thông qua các thẻ ghi nhớ. Dự án được xây dựng bằng **Node.js**, **Express**, và sử dụng **MongoDB** làm cơ sở dữ liệu chính.

Website: https://fluxquiz.vercel.app (sleep 30s)

## 🚀 Tính năng chính

* 📌 Xác thực, phân quyền người dùng
* 📂 CRUD thẻ flashcard: tạo, cập nhật, xóa, lấy danh sách
* 🧠 Các tính năng học tập: luyện ghi nhớ, luyện nghe, luyện nói, luyện viết, kiểm tra, space repition, shadowing
* 🏦 Thanh toán online để nâng cấp tài khoản (SEPAY)
* 🤖 Tích hợp AI vào các tính năng (tạo flashcard tự động, trò chuyện với AI)

## 🛠️ Công nghệ sử dụng

* Node.js
* Express.js
* MongoDB (Mongoose)

## 📦 Cài đặt và chạy local

### 1. Clone dự án

```bash
git clone https://github.com/nothings0/backend-flashcard.git
cd backend-flashcard
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo file `.env`

Tạo file `.env` ở thư mục gốc và thêm các biến môi trường sau:

```
PORT=
MONGO_URI=
```

### 4. Chạy server

```bash
npm start
```

Server sẽ chạy ở địa chỉ: `http://localhost:8000`

## 📁 Cấu trúc thư mục

```
backend-flashcard/
├— controller/      # Xử lý logic cho từng route
├— middleware/       # Các middleware
├— models/           # Định nghĩa schema MongoDB
├— route/           # Định nghĩa các API route
├— util/            # Các hàm tiện ích
├— helper/            # Các hàm tiện ích
├— .env              # Biến môi trường
├— index.js          # Điểm bắt đầu của ứng dụng
└— package.json

> Một số route yêu cầu gửi `Authorization: Bearer <token>` trong header.

## 📖 Gợi ý phát triển tiếp

* Tính năng nhắc học lại theo thuật toán Spaced Repetition
* Lưu lịch sử học tập và tiến độ
* Tích hợp API phát âm hoặc dịch từ

> Được phát triển bởi [nothings0](https://github.com/nothings0)