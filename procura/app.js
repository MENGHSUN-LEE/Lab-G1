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
            // Fix: Use string key to avoid duplicates caused by Date object references
            const dateKey = row.work_date instanceof Date ? row.work_date.toISOString().split('T')[0] : row.work_date;

            if (!progressMap.has(dateKey)) {
                progressMap.set(dateKey, {
                    date: row.work_date,
                    items: [],
                });
            }
            const dateNode = progressMap.get(dateKey);

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

// --- Vendor Management APIs ---

// 0. 初始化 Vendor Ratings Table
async function initVendorRatingsTable() {
    const dbPool = app.locals.dbPool;
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS vendor_ratings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_name VARCHAR(255) NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                project_id INT,
                rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await dbPool.execute(query);
        console.log('[MySQL] vendor_ratings table checked/created.');
    } catch (error) {
        console.error('[MySQL] Failed to init vendor_ratings table:', error);
    }
}
// 在 DB 連線後呼叫
setTimeout(() => {
    if (app.locals.dbPool) initVendorRatingsTable();
}, 1000);


// 1. Get Unique Vendors (from materials_used & Company)
app.get('/api/vendors', async (req, res) => {
    const dbPool = app.locals.dbPool;
    try {
        // User Requirement: 
        // 1. Show supplier data (from Company table).
        // 2. Ensure vendors with "Arrived" status (from materials_used) are included.

        const query = `
            SELECT name AS vendor FROM Company
            UNION
            SELECT DISTINCT vendor FROM materials_used WHERE vendor IS NOT NULL AND vendor != ''
            ORDER BY vendor;
        `;
        const [rows] = await dbPool.execute(query);
        const vendors = rows.map(r => r.vendor);
        res.json({ success: true, vendors });
    } catch (error) {
        console.error('Get Vendors error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving vendors.' });
    }
});

// 2. Add Vendor Rating
app.post('/api/vendor-ratings', async (req, res) => {
    const { vendor_name, rating, comment, project_id } = req.body;
    const dbPool = app.locals.dbPool;

    if (!vendor_name || !rating) {
        return res.status(400).json({ success: false, message: 'Vendor name and rating are required.' });
    }

    try {
        const query = `
            INSERT INTO vendor_ratings (vendor_name, rating, comment, project_id)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await dbPool.execute(query, [vendor_name, rating, comment || '', project_id || null]);

        if (result.affectedRows === 1) {
            res.json({ success: true, message: 'Rating added successfully.' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add rating.' });
        }
    } catch (error) {
        console.error('Add Vendor Rating error:', error);
        res.status(500).json({ success: false, message: 'Server error adding rating.' });
    }
});

// 3. Get Vendor Ratings
app.get('/api/vendor-ratings', async (req, res) => {
    const { vendor_name } = req.query;
    const dbPool = app.locals.dbPool;

    if (!vendor_name) {
        return res.status(400).json({ success: false, message: 'Vendor name is required.' });
    }

    try {
        const query = `
            SELECT * FROM vendor_ratings 
            WHERE vendor_name = ? 
            ORDER BY rated_at DESC
        `;
        const [rows] = await dbPool.execute(query, [vendor_name]);
        res.json({ success: true, ratings: rows });
    } catch (error) {
        console.error('Get Vendor Ratings error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving ratings.' });
    }
});

// 4. Get Vendor Performance Stats (Grouped by Category)
app.get('/api/vendor-performance', async (req, res) => {
    const dbPool = app.locals.dbPool;
    try {
        // 1. Get Ratings (Global per vendor)
        const ratingQuery = `
            SELECT 
                vendor_name, 
                AVG(rating) as avg_rating, 
                COUNT(*) as rating_count 
            FROM vendor_ratings 
            GROUP BY vendor_name
        `;
        const [ratingRows] = await dbPool.execute(ratingQuery);
        const ratingMap = {};
        ratingRows.forEach(r => {
            ratingMap[r.vendor_name] = {
                avg: parseFloat(r.avg_rating),
                count: r.rating_count
            };
        });

        // 2. Get Orders grouped by Category and Vendor
        // Join materials_used -> Material -> MaterialCategory
        const orderQuery = `
            SELECT 
                mu.vendor,
                COALESCE(mc.category_name, 'Other') as category_name,
                COUNT(*) as order_count
            FROM materials_used mu
            LEFT JOIN Material m ON mu.material_name = m.Item_Description
            LEFT JOIN MaterialCategory mc ON m.FK_category_id = mc.category_id
            WHERE mu.vendor IS NOT NULL AND mu.vendor != ''
            GROUP BY mu.vendor, mc.category_name
        `;
        const [orderRows] = await dbPool.execute(orderQuery);

        // 3. Process and Group Data
        const categoryGroups = {};

        orderRows.forEach(row => {
            const cat = row.category_name;
            const vendor = row.vendor;
            const rData = ratingMap[vendor] || { avg: 0, count: 0 };

            if (!categoryGroups[cat]) {
                categoryGroups[cat] = [];
            }

            categoryGroups[cat].push({
                vendor_name: vendor,
                order_count: row.order_count,
                avg_rating: rData.avg.toFixed(1),
                rating_count: rData.count
            });
        });

        // 4. Sort and Limit (Top 3 per category)
        const result = [];
        for (const [cat, vendors] of Object.entries(categoryGroups)) {
            // Sort by Rating (desc), then Order Count (desc)
            vendors.sort((a, b) => {
                if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
                return b.order_count - a.order_count;
            });

            result.push({
                category: cat,
                vendors: vendors.slice(0, 3) // Top 3
            });
        }

        // Sort categories alphabetically or by some priority if needed
        result.sort((a, b) => a.category.localeCompare(b.category));

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Get Vendor Performance error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving performance data.' });
    }
});

// ==================== FIXED: Material Management APIs ====================
// Replace your existing Material Management section with this code
// This version works with materials_used.id which links to actual material records

// 1. GET MATERIALS OVERVIEW - Shows all materials in project
app.get('/api/project/:projectId/materials-overview', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;
  
  try {
    // Get all materials for this project
    const [materials] = await dbPool.query(`
      SELECT 
        mu.id,
        mu.material_name,
        mu.vendor,
        mu.qty,
        mu.unit,
        mu.material_status,
        mu.unit_price,
        wi.id as work_item_id,
        wi.name as work_item_name,
        wi.work_date
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY wi.work_date, mu.material_name
    `, [projectId]);
    
    // For each material, get additional details
    const materialsWithDetails = await Promise.all(materials.map(async (mat) => {
      // Get latest arrival log
      const [arrivalLog] = await dbPool.query(`
        SELECT id, expected_date, actual_date, delivery_status, notes 
        FROM material_arrival_logs 
        WHERE material_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [mat.id]);
      
      // Get average quality score
      const [qualityScores] = await dbPool.query(`
        SELECT AVG(score) as avg_score, COUNT(*) as score_count 
        FROM material_quality_scores 
        WHERE material_id = ?
      `, [mat.id]);
      
      // Get open defects count
      const [defects] = await dbPool.query(`
        SELECT COUNT(*) as defect_count 
        FROM material_defect_reports 
        WHERE material_id = ? AND status IN ('open', 'investigating')
      `, [mat.id]);
      
      // Get received quantity
      const [inventory] = await dbPool.query(`
        SELECT SUM(quantity_received) as total_received 
        FROM material_inventory 
        WHERE material_id = ?
      `, [mat.id]);
      
      return {
        ...mat,
        arrival_log: arrivalLog[0] || null,
        avg_quality_score: qualityScores[0]?.avg_score || null,
        quality_score_count: qualityScores[0]?.score_count || 0,
        open_defects: defects[0]?.defect_count || 0,
        quantity_received: inventory[0]?.total_received || 0,
        quantity_remaining: mat.qty - (inventory[0]?.total_received || 0)
      };
    }));
    
    res.json({ success: true, materials: materialsWithDetails });
  } catch (error) {
    console.error('Get materials overview error:', error);
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤: ' + error.message 
    });
  }
});

// 2. ADD ARRIVAL LOG - Using materials_used.id
app.post('/api/materials/:materialUsedId/arrival-log', async (req, res) => {
  const { materialUsedId } = req.params;
  const { expected_date, actual_date, delivery_status, notes } = req.body;
  const dbPool = app.locals.dbPool;
  
  console.log('Adding arrival log for material_used_id:', materialUsedId);
  console.log('Request body:', req.body);
  
  if (!expected_date) {
    return res.status(400).json({ success: false, message: '預期到貨日期是必需的' });
  }
  
  try {
    // Check if material exists
    const [material] = await dbPool.query(
      'SELECT id, material_name FROM materials_used WHERE id = ?', 
      [materialUsedId]
    );
    
    if (material.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `找不到 ID=${materialUsedId} 的建材` 
      });
    }
    
    console.log('Found material:', material[0]);
    
    const [result] = await dbPool.query(`
      INSERT INTO material_arrival_logs 
      (material_id, expected_date, actual_date, delivery_status, notes) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      materialUsedId, 
      expected_date, 
      actual_date || null, 
      delivery_status || 'pending', 
      notes || ''
    ]);
    
    console.log('Insert successful, log ID:', result.insertId);
    
    res.json({ 
      success: true, 
      logId: result.insertId, 
      message: '到貨記錄新增成功' 
    });
  } catch (error) {
    console.error('Add arrival log error:', error);
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤: ' + error.message 
    });
  }
});

// 3. UPDATE ARRIVAL LOG
app.put('/api/arrival-logs/:logId', async (req, res) => {
  const { logId } = req.params;
  const { actual_date, delivery_status, notes } = req.body;
  const dbPool = app.locals.dbPool;
  
  try {
    const [result] = await dbPool.query(`
      UPDATE material_arrival_logs 
      SET actual_date = ?, delivery_status = ?, notes = ?
      WHERE id = ?
    `, [actual_date || null, delivery_status, notes || '', logId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '找不到該紀錄' });
    }
    
    res.json({ success: true, message: '到貨記錄更新成功' });
  } catch (error) {
    console.error('Update arrival log error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});

// Replace your Material Management APIs section with this corrected version
// All instances of 'pool' have been replaced with 'dbPool' from app.locals

// 4. GET ARRIVAL LOGS FOR PROJECT
app.get('/api/project/:projectId/arrival-logs', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Get pool from app.locals
  
  try {
    const [logs] = await dbPool.query(`
      SELECT 
        al.*,
        mu.material_name,
        mu.vendor,
        wi.name as work_item_name
      FROM material_arrival_logs al
      JOIN materials_used mu ON al.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY al.expected_date DESC
    `, [projectId]);
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Get arrival logs error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});

// 17. GET DELAYED SHIPMENTS
app.get('/api/project/:projectId/delayed-shipments', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Get pool from app.locals
  
  try {
    const [delayed] = await dbPool.query(`
      SELECT 
        al.*,
        mu.id as material_used_id,
        mu.material_name,
        mu.vendor,
        wi.name as work_item_name,
        DATEDIFF(CURDATE(), al.expected_date) as days_delayed
      FROM material_arrival_logs al
      JOIN materials_used mu ON al.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ? 
        AND al.delivery_status NOT IN ('delivered')
        AND al.expected_date < CURDATE()
      ORDER BY days_delayed DESC
    `, [projectId]);
    
    res.json({ success: true, delayed });
  } catch (error) {
    console.error('Get delayed shipments error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});

// 16. GET INVENTORY
app.get('/api/project/:projectId/inventory', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Get pool from app.locals
  
  try {
    const [inventory] = await dbPool.query(`
      SELECT 
        mu.id as material_used_id,
        mu.material_name,
        mu.vendor,
        mu.qty as total_ordered,
        COALESCE(SUM(mi.quantity_received), 0) as total_received,
        (mu.qty - COALESCE(SUM(mi.quantity_received), 0)) as remaining,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.id, mu.material_name, mu.vendor, mu.qty, mu.unit
      ORDER BY mu.material_name
    `, [projectId]);
    
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});

// 18. GET REORDER ALERTS
app.get('/api/project/:projectId/reorder-alerts', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Get pool from app.locals
  
  try {
    const [alerts] = await dbPool.query(`
      SELECT 
        mu.id as material_used_id,
        mu.material_name,
        mu.vendor,
        mu.qty as total_needed,
        COALESCE(SUM(mi.quantity_received), 0) as total_received,
        (mu.qty - COALESCE(SUM(mi.quantity_received), 0)) as shortage,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.id, mu.material_name, mu.vendor, mu.qty, mu.unit
      HAVING shortage > 0
      ORDER BY shortage DESC
    `, [projectId]);
    
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Get reorder alerts error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});
// 15. UPDATE INVENTORY - ENHANCED VERSION
app.post('/api/materials/:materialUsedId/inventory-update', async (req, res) => {
  const { materialUsedId } = req.params;
  const { quantity_received, received_date, notes } = req.body;
  const dbPool = app.locals.dbPool;
  
  if (!quantity_received || !received_date) {
    return res.status(400).json({ success: false, message: '數量和日期是必需的' });
  }
  
  if (quantity_received <= 0) {
    return res.status(400).json({ success: false, message: '數量必須大於 0' });
  }
  
  try {
    // 1. Verify material exists
    const [material] = await dbPool.query(
      'SELECT id, material_name, qty FROM materials_used WHERE id = ?', 
      [materialUsedId]
    );
    
    if (material.length === 0) {
      return res.status(404).json({ success: false, message: '找不到該建材' });
    }
    
    const materialData = material[0];
    
    // 2. Insert inventory record
    const [result] = await dbPool.query(`
      INSERT INTO material_inventory 
      (material_id, quantity_received, received_date, notes) 
      VALUES (?, ?, ?, ?)
    `, [materialUsedId, quantity_received, received_date, notes || '']);
    
    // 3. Check if material is now fully received
    const [inventorySum] = await dbPool.query(`
      SELECT SUM(quantity_received) as total_received 
      FROM material_inventory 
      WHERE material_id = ?
    `, [materialUsedId]);
    
    const totalReceived = parseFloat(inventorySum[0]?.total_received || 0);
    const totalOrdered = parseFloat(materialData.qty || 0);
    const isFullyReceived = totalReceived >= totalOrdered;
    
    // 4. Update arrival log status to 'delivered'
    const [arrivalLogs] = await dbPool.query(`
      SELECT id, delivery_status
      FROM material_arrival_logs 
      WHERE material_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [materialUsedId]);
    
    if (arrivalLogs.length > 0 && arrivalLogs[0].delivery_status !== 'delivered') {
      await dbPool.query(`
        UPDATE material_arrival_logs 
        SET delivery_status = 'delivered', actual_date = ?
        WHERE id = ?
      `, [received_date, arrivalLogs[0].id]);
    }
    
    // 5. Update material_status if fully received
    if (isFullyReceived) {
      await dbPool.query(`
        UPDATE materials_used 
        SET material_status = 0 
        WHERE id = ?
      `, [materialUsedId]);
    }
    
    res.json({ 
      success: true, 
      inventoryId: result.insertId, 
      message: '庫存更新成功',
      status: {
        total_received: totalReceived,
        total_ordered: totalOrdered,
        is_fully_received: isFullyReceived,
        remaining: totalOrdered - totalReceived
      }
    });
    
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});
// 19. GET COST ANALYSIS
app.get('/api/project/:projectId/cost-analysis', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Get pool from app.locals
  
  try {
    const [costs] = await dbPool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        mu.qty,
        mu.unit,
        mu.unit_price,
        (mu.qty * COALESCE(mu.unit_price, 0)) as total_cost
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY total_cost DESC
    `, [projectId]);
    
    const totalProjectCost = costs.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    
    res.json({ 
      success: true, 
      costs,
      totalProjectCost: totalProjectCost.toFixed(2)
    });
  } catch (error) {
    console.error('Get cost analysis error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤: ' + error.message });
  }
});

// AI ANALYTICS APIs - ALL FIXED

// 1. Material Usage History
app.get('/api/project/:projectId/material-usage-history', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [history] = await dbPool.query(`
      SELECT 
        mu.material_name,
        mu.qty as quantity,
        mu.unit,
        wi.work_date as date,
        mu.created_at
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY wi.work_date DESC
    `, [projectId]);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching material usage history:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 2. Vendor Performance Analysis
app.get('/api/project/:projectId/vendor-performance-analysis', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [vendors] = await dbPool.query(`
      SELECT 
        mu.vendor as name,
        COUNT(DISTINCT mu.id) as total_deliveries,
        SUM(CASE WHEN al.delivery_status = 'delivered' 
            AND al.actual_date <= al.expected_date THEN 1 ELSE 0 END) as on_time_deliveries,
        AVG(COALESCE(qs.score, 7)) as avg_quality_score,
        COUNT(DISTINCT dr.id) as defect_count
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_arrival_logs al ON mu.id = al.material_id
      LEFT JOIN material_quality_scores qs ON mu.id = qs.material_id
      LEFT JOIN material_defect_reports dr ON mu.id = dr.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.vendor
      HAVING total_deliveries > 0
    `, [projectId]);
    
    res.json({ success: true, vendors });
  } catch (error) {
    console.error('Error analyzing vendor performance:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 3. Anomaly Detection Data
app.get('/api/project/:projectId/anomaly-detection', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [prices] = await dbPool.query(`
      SELECT 
        mu.material_name,
        mu.unit_price as price,
        mu.vendor,
        wi.work_date
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ? AND mu.unit_price > 0
      ORDER BY wi.work_date DESC
    `, [projectId]);
    
    const [qualityScores] = await dbPool.query(`
      SELECT 
        mu.material_name,
        qs.score,
        qs.inspection_date
      FROM material_quality_scores qs
      JOIN materials_used mu ON qs.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY qs.inspection_date DESC
    `, [projectId]);
    
    res.json({ 
      success: true, 
      metrics: { prices, qualityScores } 
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 4. Project Risk Assessment
app.get('/api/project/:projectId/risk-assessment', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [workItems] = await dbPool.query(`
      SELECT 
        COUNT(*) as total_work_items,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as delayed_work_items
      FROM work_items
      WHERE project_id = ?
    `, [projectId]);
    
    const [materials] = await dbPool.query(`
      SELECT 
        COUNT(DISTINCT mu.id) as total_materials,
        SUM(CASE WHEN al.delivery_status = 'delayed' 
            OR (al.delivery_status != 'delivered' AND al.expected_date < CURDATE()) 
            THEN 1 ELSE 0 END) as delayed_materials
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_arrival_logs al ON mu.id = al.material_id
      WHERE wi.project_id = ?
    `, [projectId]);
    
    res.json({
      success: true,
      metrics: {
        total_work_items: workItems[0].total_work_items || 0,
        delayed_work_items: workItems[0].delayed_work_items || 0,
        total_materials: materials[0].total_materials || 0,
        delayed_materials: materials[0].delayed_materials || 0
      }
    });
  } catch (error) {
    console.error('Error assessing project risk:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 5. AI-Powered Insights
app.post('/api/project/:projectId/ai-insights', async (req, res) => {
  const { projectId } = req.params;
  const { query } = req.body;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [projectData] = await dbPool.query(`
      SELECT 
        p.project_name,
        COUNT(DISTINCT wi.id) as total_work_items,
        COUNT(DISTINCT mu.id) as total_materials,
        SUM(mu.qty * COALESCE(mu.unit_price, 0)) as total_cost
      FROM projects p
      LEFT JOIN work_items wi ON p.id = wi.project_id
      LEFT JOIN materials_used mu ON wi.id = mu.work_item_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [projectId]);
    
    if (projectData.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const project = projectData[0];
    
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `You are a construction project analyst. Here's the project data:

Project: ${project.project_name}
Total Work Items: ${project.total_work_items}
Total Materials: ${project.total_materials}
Total Cost: $${project.total_cost}

User Question: "${query}"

Provide a detailed, actionable analysis based on this data.`
        }]
      })
    });
    
    const aiData = await aiResponse.json();
    const insights = aiData.content[0].text;
    
    res.json({ 
      success: true, 
      insights,
      projectContext: project
    });
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 6. Material Substitution Recommendations
app.get('/api/materials/:materialId/substitutes', async (req, res) => {
  const { materialId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [material] = await dbPool.query(`
      SELECT * FROM materials_used WHERE id = ?
    `, [materialId]);
    
    if (material.length === 0) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    
    const [substitutes] = await dbPool.query(`
      SELECT * FROM Material 
      WHERE Item_Description LIKE ?
      LIMIT 5
    `, [`%${material[0].material_name.split(' ')[0]}%`]);
    
    res.json({ 
      success: true, 
      originalMaterial: material[0],
      substitutes 
    });
    
  } catch (error) {
    console.error('Error finding substitutes:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 7. Carbon Footprint Calculator
app.get('/api/project/:projectId/carbon-footprint', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool; // ✅ Fixed
  
  try {
    const [materials] = await dbPool.query(`
      SELECT 
        mu.material_name,
        SUM(mu.qty) as total_quantity,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.unit
    `, [projectId]);
    
    const carbonFactors = {
      'cement': 0.9,
      'steel': 2.0,
      'concrete': 0.15,
      'wood': 0.05,
      'default': 0.1
    };
    
    const footprint = materials.map(m => {
      const factor = carbonFactors[m.material_name.toLowerCase()] || carbonFactors.default;
      return {
        material: m.material_name,
        quantity: m.total_quantity,
        unit: m.unit,
        co2_kg: (m.total_quantity * factor).toFixed(2)
      };
    });
    
    const totalCO2 = footprint.reduce((sum, m) => sum + parseFloat(m.co2_kg), 0);
    
    res.json({
      success: true,
      totalCO2: totalCO2.toFixed(2),
      breakdown: footprint
    });
    
  } catch (error) {
    console.error('Error calculating carbon footprint:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});