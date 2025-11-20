// app.js (Express 伺服器 - 專為 Docker 指令優化)

const express = require('express');
const path = require('path');
// ==========================================================
// 【新增】資料庫相關模組與配置
// 確保您已在容器內執行過 npm install mysql2
const db = require('mysql2'); 
const configs = require('./config'); 

const app = express();

// Docker 運行指令是 -p 8080:80，所以容器內必須監聽 80 埠
const PORT = 80;

// 【新增】2. 建立資料庫連線物件
const connection = db.createConnection(configs.db);

// 【新增】3. 測試並啟用連線
connection.connect((err) => {
    if(err) {
        console.error("❌ Error connecting to database (assignment-mysql): ", err.message);
    } else {
        console.log("✅ Successfully connected to database (assignment-mysql)");
    }
});

// 【新增】4. (建議) 將連線物件掛載到 app 供後續路由使用
// 這樣在您的 router.js 或其他路由處理器中，可以透過 req.app.locals.dbConnection 存取連線
app.locals.dbConnection = connection; 


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