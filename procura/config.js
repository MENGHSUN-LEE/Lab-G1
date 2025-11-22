// config.js
const config = {
  db: {
    // 使用容器名稱作為 Host (因為 Node.js 容器和 MySQL 容器在同一個 Docker 網路中)
    host: "assignment-mysql", 
    // 應用程式專用帳號
    user: "Procura",
    // 應用程式專用密碼
    password: "417", 
    // 資料庫名稱 (請確保您的 MySQL 容器內有這個名稱的資料庫)
    database: "assignment_db", 
    connectTimeout: 60000 
  },
};

module.exports = config;