// app.js (Express 伺服器 - 專為 Docker 指令優化)

const express = require('express');
const path = require('path');
const app = express();

// Docker 運行指令是 -p 8080:80，所以容器內必須監聽 80 埠
const PORT = 80;

// 將當前目錄（容器內的 /app 目錄，即本地的 .\procura）設定為提供靜態檔案的根目錄
app.use(express.static(path.join(__dirname)));

// 確保在瀏覽器直接存取根目錄 '/' 時，會回傳 procura.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'procura.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`[Express] Server is running on container port ${PORT}`);
  console.log(`Access on your host machine: http://localhost:8080`);
});