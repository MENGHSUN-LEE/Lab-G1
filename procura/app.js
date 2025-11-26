// procura/app.js

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); // 引入 promise 版本
const bcrypt = require('bcrypt'); // 用於加密密碼
const config = require('./config'); // 引入您的配置檔

const app = express();
const PORT = process.env.PORT || 80;

// --- 中介軟體 (Middleware) ---
// 1. 處理 JSON 格式的請求體 (POST/PUT 請求)
app.use(express.json());
// 2. 處理 URL-encoded 格式的請求體 (常見於表單)
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));

// --- 資料庫連線初始化 ---
async function initializeDB() {
    try {
        console.log('[MySQL] Connecting to database...');
        // 建立資料庫連線池 (Connection Pool)
        const pool = mysql.createPool(config.db);
        app.locals.dbPool = pool;
        console.log('[MySQL] Connection Pool created successfully.');

        // 檢查連線
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        console.log('[MySQL] Connection verified. Solution:', rows[0].solution);

    } catch (error) {
        console.error('[MySQL] Database connection failed:', error.message);
        // 在生產環境中，這裡通常會終止應用程式或進行重試
        // process.exit(1); 
    }
}
initializeDB();

// --- API 路由：帳號相關 ---

// 1. 註冊 (Sign Up) 路由
app.post('/api/signup', async (req, res) => {
    const { suCompany, suEmail, suPhone, suPassword, suPlan } = req.body;
    
    // 簡單的輸入驗證
    if (!suEmail || !suPassword) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    
    try {
        const dbPool = app.locals.dbPool;
        // 1. 密碼加密 (saltRounds = 10 是標準推薦值)
        const passwordHash = await bcrypt.hash(suPassword, 10);
        
        // 2. 執行插入操作
        const query = `
            INSERT INTO users 
            (company_name, email, phone, password_hash, subscription_plan) 
            VALUES (?, ?, ?, ?, ?);
        `;
        const [result] = await dbPool.execute(query, [
            suCompany, 
            suEmail, 
            suPhone, 
            passwordHash, 
            suPlan
        ]);

        if (result.affectedRows === 1) {
            res.json({ success: true, message: 'Account created successfully. Please log in.' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create account.' });
        }

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'The email is already registered.' });
        }
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error during sign up.' });
    }
});
// 2. 登入 (Log In) 路由
app.post('/api/login', async (req, res) => {
    const { loginEmail, loginPassword } = req.body;

    if (!loginEmail || !loginPassword) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const dbPool = app.locals.dbPool;
        // 1. 查詢用戶 (新增查詢 subscription_plan)
        const [rows] = await dbPool.execute('SELECT id, password_hash, subscription_plan FROM users WHERE email = ?', [loginEmail]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = rows[0];
        // 2. 比較密碼
        const match = await bcrypt.compare(loginPassword, user.password_hash);

       if (match) {
            // 登入成功：返回用戶 ID 和訂閱方案
            res.json({ 
                success: true, 
                message: 'Login successful.', 
                user_id: user.id,
                subscription_plan: user.subscription_plan 
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});
// 3. 創建專案 (Create Project) 路由
app.post('/api/projects', async (req, res) => {
    // 預期前端傳來 user_id 和 user_plan，以及專案資料
    const { user_id, user_plan, name, tags, owner } = req.body; 
    const dbPool = app.locals.dbPool;

    if (!user_id || !name || !tags || !owner) {
        return res.status(400).json({ success: false, message: '專案名稱、標籤、擁有者和用戶資訊是必需的。' });
    }

    try {
        // --- 檢查免費帳號限制 (第二點要求) ---
        if (user_plan === 'trial') {
            const [countRows] = await dbPool.execute(
                'SELECT COUNT(*) as project_count FROM projects WHERE user_id = ?',
                [user_id]
            );
            
            if (countRows[0].project_count >= 1) {
                return res.status(403).json({ 
                    success: false, 
                    message: '免費 (trial) 帳號僅限創建一個專案。請升級您的方案。' 
                });
            }
        }

        // --- 執行專案創建 ---
        // 將前端傳來的 tags 陣列轉換為逗號分隔的字串
        const tagsString = Array.isArray(tags) ? tags.join(',') : tags;

        const insertQuery = `
            INSERT INTO projects (user_id, project_name, tags, owner)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await dbPool.execute(insertQuery, [
            user_id, name, tagsString, owner
        ]);

        if (result.affectedRows === 1) {
            res.json({ 
                success: true, 
                message: '專案創建成功。', 
                project_id: result.insertId,
                name: name,
                owner: owner
            });
        } else {
            res.status(500).json({ success: false, message: '專案創建失敗。' });
        }

    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法創建專案。' });
    }
});

// --- 靜態檔案服務 (Static File Serving) ---
app.use(express.static(path.join(__dirname)));

// 確保在瀏覽器直接存取根目錄 '/' 時，會回傳 procura.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'procura.html'));
});

app.get('/api/projects', async (req, res) => {
    const { user_id, q } = req.query; 
    const dbPool = app.locals.dbPool;

    if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    let query = 'SELECT id, project_name, tags, owner FROM projects WHERE user_id = ?';
    let params = [user_id];

    if (q) {
        const searchTerm = `%${q}%`;
        query += ' AND (project_name LIKE ? OR tags LIKE ? OR owner LIKE ?)';
        params.push(searchTerm, searchTerm, searchTerm);
    }

    try {
        const [projects] = await dbPool.execute(query, params);
        
        const formattedProjects = projects.map(p => ({
            ...p,
            tags: p.tags ? p.tags.split(',').map(tag => tag.trim()) : []
        }));

        res.json({ 
            success: true, 
            projects: formattedProjects 
        });

    } catch (error) {
        console.error('Get Projects error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving projects.' });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    const projectId = req.params.id;
    const dbPool = app.locals.dbPool;

    // 結合查詢：從 projects 開始，LEFT JOIN work_items，再 LEFT JOIN materials_used
    const query = `
        SELECT
            p.id AS project_id, p.project_name, p.tags, p.owner,
            w.id AS work_id, w.work_date, w.name AS work_name, w.start_time, w.status AS work_status,
            m.id AS material_id, m.material_name, m.vendor, m.qty, m.unit, m.material_status
        FROM projects p
        LEFT JOIN work_items w ON p.id = w.project_id
        LEFT JOIN materials_used m ON w.id = m.work_item_id
        WHERE p.id = ?
        ORDER BY w.work_date, w.start_time;
    `;

    try {
        const [rows] = await dbPool.execute(query, [projectId]);
        
        if (rows.length === 0 || rows[0].project_id === null) {
            return res.status(404).json({ success: false, message: '專案未找到。' });
        }
        
        const projectRow = rows[0];

        // --- 1. 處理基本專案資訊 ---
        const project = {
            id: projectRow.project_id,
            name: projectRow.project_name,
            owner: projectRow.owner,
            // 將 tags 字串轉回陣列
            tags: projectRow.tags ? projectRow.tags.split(',').map(tag => tag.trim()) : [],
            overview: '專案詳細概述 (可從 projects 表新增欄位)', // 暫時保留 placeholder
            progress: [],
        };
        
        // --- 2. 轉換為巢狀 Progress 結構 ---
        const progressMap = new Map(); // 用來儲存 { '2025-09-20': { date: ..., items: [...] } }
        const workItemMap = new Map(); // 用來儲存 { work_id: work_item_object }

        rows.forEach(row => {
            // 如果沒有 work_id，表示專案存在但沒有工項，跳過後續處理
            if (!row.work_id) return; 

            // 處理 Progress Date Node (進度日期節點)
            if (!progressMap.has(row.work_date)) {
                progressMap.set(row.work_date, {
                    date: row.work_date,
                    items: [],
                });
            }
            const dateNode = progressMap.get(row.work_date);

            // 處理 Work Item (工項)
            if (!workItemMap.has(row.work_id)) {
                const workItem = {
                    id: row.work_id,
                    name: row.work_name,
                    start: row.start_time,
                    status: row.work_status,
                    materials: [],
                };
                workItemMap.set(row.work_id, workItem);
                dateNode.items.push(workItem); // 將工項加入日期節點
            }
            const workItem = workItemMap.get(row.work_id);

            // 處理 Materials Used (建材使用)
            if (row.material_id) {
                workItem.materials.push({
                    id: row.material_id,
                    name: row.material_name,
                    vendor: row.vendor,
                    qty: parseFloat(row.qty),
                    unit: row.unit,
                    mstatus: row.material_status,
                });
            }
        });
        
        // 將 Map 轉換為陣列並賦值給 project.progress
        project.progress = Array.from(progressMap.values());

        res.json({ success: true, project: project });

    } catch (error) {
        console.error('Get Project Detail error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法獲取專案細節。' });
    }
});

app.post('/api/work-items', async (req, res) => {
    // 預期前端傳來 project ID (從 state.currentProject) 和工項資料
    const { projectId, date, name, startTime } = req.body; 
    const dbPool = app.locals.dbPool;

    // 必填欄位檢查
    if (!projectId || !date || !name || !startTime) {
        return res.status(400).json({ success: false, message: '缺少專案ID、日期、工項名稱或開始時間。' });
    }

    try {
        // 狀態 status 預設為 1 (正常)
        const query = `
            INSERT INTO work_items (project_id, work_date, name, start_time, status)
            VALUES (?, ?, ?, ?, 1); 
        `; 

        const [result] = await dbPool.execute(query, [projectId, date, name, startTime]);

        if (result.affectedRows === 1) {
            res.json({ 
                success: true, 
                message: '工項新增成功。', 
                work_item_id: result.insertId
            });
        } else {
            res.status(500).json({ success: false, message: '新增工項失敗。' });
        }

    } catch (error) {
        console.error('Create Work Item error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法新增工項。' });
    }
});

app.get('/api/work-items/selectors', async (req, res) => {
    const { project_id } = req.query;
    const dbPool = app.locals.dbPool;

    if (!project_id) {
        return res.status(400).json({ success: false, message: 'Project ID is required.' });
    }

    try {
        const query = `
            SELECT id, work_date, name
            FROM work_items
            WHERE project_id = ?
            ORDER BY work_date, start_time;
        `;
        const [rows] = await dbPool.execute(query, [project_id]);

        // 將扁平結果按日期分組 (前端邏輯所需)
        const groupedData = {};
        rows.forEach(row => {
            // 格式化日期為 YYYY-MM-DD 字串
            const date = row.work_date.toISOString().split('T')[0]; 
            if (!groupedData[date]) {
                groupedData[date] = [];
            }
            groupedData[date].push({ id: row.id, name: row.name });
        });

        res.json({ success: true, data: groupedData });

    } catch (error) {
        console.error('Work Item Selectors error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving work item selectors.' });
    }
});

app.get('/api/materials', async (req, res) => {
    const { category_id } = req.query; 
    const dbPool = app.locals.dbPool;

    if (!category_id) {
        return res.status(400).json({ success: false, message: 'Category ID is required.' });
    }

    try {
       const query = `
            SELECT material_id AS id, Item_Description 
            FROM Material 
            WHERE FK_category_id = ?  
            ORDER BY Item_Description
        `;
        const [materials] = await dbPool.execute(query, [category_id]);

        res.json({ success: true, materials: materials });

    } catch (error) {
        console.error('Material Options Fetch Error:', error); 
        res.status(500).json({ success: false, message: 'Server error retrieving material list.' });
    }
});

app.get('/api/material-details', async (req, res) => {
    const { material_id } = req.query;
    const dbPool = app.locals.dbPool;

    if (!material_id) {
        return res.status(400).json({ success: false, message: 'Material ID is required.' });
    }

    try {
        // 1. 查詢單位名稱 (Material JOIN UnitOfMeasure)
        const unitQuery = `
            SELECT T2.unit_name
            FROM Material T1
            JOIN UnitOfMeasure T2 ON T1.FK_unit_id = T2.unit_id
            WHERE T1.material_id = ?
        `;
        const [unitRows] = await dbPool.execute(unitQuery, [material_id]);

        // 2. 查詢所有供應商 (Transaction JOIN Company)
        const vendorQuery = `
            SELECT DISTINCT T3.name
            FROM Transaction T2 
            JOIN Company T3 ON T2.FK_company_id = T3.company_id
            WHERE T2.FK_material_id = ? 
        `;
        const [vendorRows] = await dbPool.execute(vendorQuery, [material_id]);

        const unitName = unitRows.length > 0 ? unitRows[0].unit_name : '';
        const vendors = vendorRows.map(row => row.name);

        res.json({ 
            success: true, 
            unit_name: unitName,
            vendors: vendors // 供應商列表
        });

    } catch (error) {
        console.error('Material Details error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving material details.' });
    }
});

app.post('/api/materials-used', async (req, res) => {
    // 預期前端傳來 work_item_id, material_name, vendor, qty, unit
    const { work_item_id, material_name, vendor, qty, unit } = req.body;
    const dbPool = app.locals.dbPool;
    const default_status = 2; // 未叫貨 (Pending Order)

    // 必填欄位檢查
    if (!work_item_id || !material_name || qty === undefined || qty === null || isNaN(parseFloat(qty))) {
        return res.status(400).json({ success: false, message: '工項 ID、建材名稱和數量是必需的。' });
    }

    try {
        const query = `
            INSERT INTO materials_used 
            (work_item_id, material_name, vendor, qty, unit, material_status)
            VALUES (?, ?, ?, ?, ?, ?);
        `;

        const [result] = await dbPool.execute(query, [
            work_item_id, 
            material_name, 
            vendor || null, 
            qty, 
            unit || null,   
            default_status
        ]);

        if (result.affectedRows === 1) {
            res.json({ 
                success: true, 
                message: '建材紀錄新增成功。', 
                material_used_id: result.insertId
            });
        } else {
            res.status(500).json({ success: false, message: '新增建材紀錄失敗。' });
        }

    } catch (error) {
        console.error('Create Material Used error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法新增建材紀錄。' });
    }
});

app.put('/api/work-items/:id/status', async (req, res) => {
    const workItemId = req.params.id;
    const { status } = req.body; // 預期接收新的狀態值 (0, 1, or 2)
    const dbPool = app.locals.dbPool;

    if (status === undefined) {
        return res.status(400).json({ success: false, message: '新的狀態值是必需的。' });
    }

    try {
        const query = `
            UPDATE work_items
            SET status = ?
            WHERE id = ?;
        `;
        const [result] = await dbPool.execute(query, [status, workItemId]);

        if (result.affectedRows === 1) {
            res.json({ success: true, message: '工項狀態更新成功。' });
        } else {
            res.status(404).json({ success: false, message: '找不到該工項或狀態未更改。' });
        }
    } catch (error) {
        console.error('Update Work Item Status error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法更新工項狀態。' });
    }
});

app.put('/api/materials-used/:id/status', async (req, res) => {
    const materialUsedId = req.params.id;
    const { status } = req.body; // 預期接收新的狀態值 (0, 1, 2, or 3)
    const dbPool = app.locals.dbPool;

    if (status === undefined) {
        return res.status(400).json({ success: false, message: '新的建材狀態值是必需的。' });
    }

    try {
        const query = `
            UPDATE materials_used
            SET material_status = ?
            WHERE id = ?;
        `;
        const [result] = await dbPool.execute(query, [status, materialUsedId]);

        if (result.affectedRows === 1) {
            res.json({ success: true, message: '建材狀態更新成功。' });
        } else {
            res.status(404).json({ success: false, message: '找不到該建材紀錄或狀態未更改。' });
        }
    } catch (error) {
        console.error('Update Material Status error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法更新建材狀態。' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    const userId = req.params.id;
    const dbPool = app.locals.dbPool;
    
    try {
        const [rows] = await dbPool.execute(
            'SELECT company_name, email, phone, subscription_plan FROM users WHERE id = ?', 
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.json({ success: true, user: rows[0] });
    } catch (error) {
        console.error('Get User Data error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving user data.' });
    }
});

app.put('/api/users/:id/password', async (req, res) => {
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;
    const dbPool = app.locals.dbPool;

    try {
        // 1. 驗證舊密碼
        const [rows] = await dbPool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        
        const user = rows[0];
        const match = await bcrypt.compare(oldPassword, user.password_hash);
        
        if (!match) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        // 2. 雜湊新密碼
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 3. 更新資料庫
        const [result] = await dbPool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);

        if (result.affectedRows === 1) {
            res.json({ success: true, message: 'Password updated successfully.' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to update password.' });
        }

    } catch (error) {
        console.error('Password Update error:', error);
        res.status(500).json({ success: false, message: 'Server error during password update.' });
    }
});

app.put('/api/users/:id/profile', async (req, res) => {
    const userId = req.params.id;
    // 🚨 接收 email
    const { company_name, phone, email, subscription_plan } = req.body; 
    const dbPool = app.locals.dbPool;

    if (!company_name || !phone || !email || !subscription_plan) {
        return res.status(400).json({ success: false, message: '所有欄位是必需的。' });
    }
    
    try {
        const query = `
            UPDATE users
            SET company_name = ?, phone = ?, email = ?, subscription_plan = ? 
            WHERE id = ?;
        `;

        const [result] = await dbPool.execute(query, [company_name, phone, email, subscription_plan, userId]);

        if (result.affectedRows === 1) {
            res.json({ success: true, message: '帳號資訊更新成功。' });
        } else {
            res.status(404).json({ success: false, message: '找不到該用戶紀錄或資料未更改。' });
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: '此電子郵件已被其他帳號使用。' });
        }
        console.error('Update User Profile error:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤：無法更新帳號資訊。' });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`[Express] Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
});