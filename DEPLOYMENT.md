# Deployment Instructions / Hướng Dẫn Triển Khai

## English Version

### Option 1: Deploy from Pull Request Branch (Recommended for Testing)

1. **SSH into your VPS:**
   ```bash
   ssh your_user@your_vps_ip
   ```

2. **Navigate to your bot directory:**
   ```bash
   cd /path/to/pa-bot
   ```

3. **Stop the running bot (if using PM2):**
   ```bash
   pm2 stop pa-bot
   # OR if using systemd:
   sudo systemctl stop pa-bot
   ```

4. **Backup your current .env file:**
   ```bash
   cp .env .env.backup
   ```

5. **Fetch the latest changes:**
   ```bash
   git fetch origin
   ```

6. **Switch to the PR branch:**
   ```bash
   git checkout copilot/improve-diagnostics-and-resilience
   ```

7. **Pull the latest changes:**
   ```bash
   git pull origin copilot/improve-diagnostics-and-resilience
   ```

8. **Install any new dependencies:**
   ```bash
   npm install
   ```

9. **Restore your .env file (if needed):**
   ```bash
   cp .env.backup .env
   ```

10. **(Optional) Add new diagnostic variables to .env:**
    ```bash
    # Add these lines to your .env file:
    echo "VERBOSE_SYMBOL_VALIDATION=false" >> .env
    echo "DIAGNOSTIC_MODE=false" >> .env
    ```

11. **Test the bot (dry run):**
    ```bash
    DRY_RUN=true DIAGNOSTIC_MODE=true npm start
    ```
    
    Press Ctrl+C after verifying it starts without errors.

12. **Start the bot:**
    ```bash
    # If using PM2:
    pm2 start src/index.js --name pa-bot
    pm2 save
    
    # OR if using systemd:
    sudo systemctl start pa-bot
    ```

13. **Monitor logs:**
    ```bash
    # If using PM2:
    pm2 logs pa-bot
    
    # OR if using systemd:
    sudo journalctl -u pa-bot -f
    ```

---

### Option 2: Deploy from Main Branch (After PR is Merged)

**Wait until the PR is merged to main branch**, then:

1. **SSH into your VPS:**
   ```bash
   ssh your_user@your_vps_ip
   cd /path/to/pa-bot
   ```

2. **Stop the bot:**
   ```bash
   pm2 stop pa-bot
   ```

3. **Switch to main branch and pull:**
   ```bash
   git checkout main
   git pull origin main
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Update .env (optional):**
   ```bash
   # Add new diagnostic variables if you want them:
   VERBOSE_SYMBOL_VALIDATION=false
   DIAGNOSTIC_MODE=false
   ```

6. **Restart the bot:**
   ```bash
   pm2 restart pa-bot
   pm2 save
   ```

---

## Vietnamese Version (Phiên Bản Tiếng Việt)

### Tùy Chọn 1: Triển Khai từ Branch Pull Request (Khuyến Nghị cho Test)

1. **SSH vào VPS của bạn:**
   ```bash
   ssh user_cua_ban@ip_vps
   ```

2. **Vào thư mục bot:**
   ```bash
   cd /duong/dan/toi/pa-bot
   ```

3. **Dừng bot đang chạy (nếu dùng PM2):**
   ```bash
   pm2 stop pa-bot
   # HOẶC nếu dùng systemd:
   sudo systemctl stop pa-bot
   ```

4. **Backup file .env hiện tại:**
   ```bash
   cp .env .env.backup
   ```

5. **Lấy các thay đổi mới nhất:**
   ```bash
   git fetch origin
   ```

6. **Chuyển sang branch PR:**
   ```bash
   git checkout copilot/improve-diagnostics-and-resilience
   ```

7. **Pull code mới:**
   ```bash
   git pull origin copilot/improve-diagnostics-and-resilience
   ```

8. **Cài đặt dependencies mới (nếu có):**
   ```bash
   npm install
   ```

9. **Khôi phục file .env (nếu cần):**
   ```bash
   cp .env.backup .env
   ```

10. **(Tùy chọn) Thêm biến diagnostic mới vào .env:**
    ```bash
    # Thêm các dòng này vào file .env:
    echo "VERBOSE_SYMBOL_VALIDATION=false" >> .env
    echo "DIAGNOSTIC_MODE=false" >> .env
    ```

11. **Test bot (chế độ dry run):**
    ```bash
    DRY_RUN=true DIAGNOSTIC_MODE=true npm start
    ```
    
    Nhấn Ctrl+C sau khi xác nhận bot chạy không lỗi.

12. **Khởi động bot:**
    ```bash
    # Nếu dùng PM2:
    pm2 start src/index.js --name pa-bot
    pm2 save
    
    # HOẶC nếu dùng systemd:
    sudo systemctl start pa-bot
    ```

13. **Xem logs:**
    ```bash
    # Nếu dùng PM2:
    pm2 logs pa-bot
    
    # HOẶC nếu dùng systemd:
    sudo journalctl -u pa-bot -f
    ```

---

### Tùy Chọn 2: Triển Khai từ Branch Main (Sau Khi PR Được Merge)

**Đợi cho đến khi PR được merge vào branch main**, sau đó:

1. **SSH vào VPS:**
   ```bash
   ssh user_cua_ban@ip_vps
   cd /duong/dan/toi/pa-bot
   ```

2. **Dừng bot:**
   ```bash
   pm2 stop pa-bot
   ```

3. **Chuyển sang main và pull code:**
   ```bash
   git checkout main
   git pull origin main
   ```

4. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

5. **Cập nhật .env (tùy chọn):**
   ```bash
   # Thêm các biến diagnostic mới nếu muốn:
   VERBOSE_SYMBOL_VALIDATION=false
   DIAGNOSTIC_MODE=false
   ```

6. **Khởi động lại bot:**
   ```bash
   pm2 restart pa-bot
   pm2 save
   ```

---

## Quick Commands Summary / Tóm Tắt Lệnh Nhanh

### Test PR Branch (Branch PR để Test):
```bash
cd /path/to/pa-bot
pm2 stop pa-bot
git fetch origin
git checkout copilot/improve-diagnostics-and-resilience
git pull
npm install
pm2 restart pa-bot
pm2 logs pa-bot
```

### Deploy Main Branch (Triển Khai Branch Main):
```bash
cd /path/to/pa-bot
pm2 stop pa-bot
git checkout main
git pull
npm install
pm2 restart pa-bot
pm2 logs pa-bot
```

---

## Troubleshooting / Xử Lý Lỗi

### Nếu gặp lỗi "local changes" khi pull:
```bash
git stash        # Lưu thay đổi local
git pull         # Pull code mới
git stash pop    # Khôi phục thay đổi local (nếu cần)
```

### Nếu muốn reset về code gốc (mất hết thay đổi local):
```bash
git reset --hard origin/copilot/improve-diagnostics-and-resilience
```

### Kiểm tra branch hiện tại:
```bash
git branch
```

### Xem log git:
```bash
git log --oneline -5
```

---

## New Features Testing / Test Tính Năng Mới

### Bật chế độ diagnostic để debug:
```bash
# Sửa file .env:
DIAGNOSTIC_MODE=true
VERBOSE_SYMBOL_VALIDATION=true

# Hoặc chạy tạm thời:
DIAGNOSTIC_MODE=true npm start
```

### Test validation candle:
```bash
node test-candle-validation.js
```

### Xem demo tất cả tính năng:
```bash
node demo-diagnostics.js
```
