# Dockerfile

# 1. 選擇基礎映像檔：使用輕量級的 Node.js 版本
FROM node:20-alpine

# 2. 在容器內創建並設定工作目錄
WORKDIR /app

# 3. 複製 package.json 和 package-lock.json (若存在)
#    此步驟是為了利用 Docker 快取機制，如果依賴沒變，則跳過 npm install
COPY package*.json ./

# 4. 安裝專案依賴
RUN npm install

# 5. 複製所有應用程式程式碼到工作目錄
#    包含 server.js, procura.html, procura.css, js/ 資料夾等
COPY . .

# 6. 宣告容器將監聽 8080 port (與 server.js 中的 PORT 匹配)
EXPOSE 8080

# 7. 定義容器啟動時執行的指令
CMD ["npm", "start"]