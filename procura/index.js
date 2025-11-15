const express = require('express');
const path = require('path');
const app = express();
// 設置伺服器運行在容器的 PORT 環境變數，如果沒有則使用 8080
const PORT = process.env.PORT || 8080;

// 將當前目錄（容器內的 /app 目錄）設定為提供靜態檔案的根目錄
// Express 會自動處理 procura.html, procura.css, js/ 等檔案的請求
app.use(express.static(path.join(__dirname)));

// 確保在瀏覽器直接存取根目錄 '/' 時，會回傳 procura.html
// 這是 Express 靜態檔案服務的慣用設定
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'procura.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`[Express] Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
});