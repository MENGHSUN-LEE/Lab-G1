// procura/app.js

const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise'); // 引入 promise 版本
const bcrypt = require('bcrypt'); // 用於加密密碼
const config = require('./config'); // 引入您的配置檔

const app = express();
const PORT = process.env.PORT || 80;
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const downloadsDir = path.join(__dirname, 'downloads');

// Create downloads directory
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
  console.log('[Downloads] Created directory:', downloadsDir);
} else {
  console.log('[Downloads] Directory exists:', downloadsDir);
}

// Verify write permissions
try {
  fs.accessSync(downloadsDir, fs.constants.W_OK);
  console.log('[Downloads] Write permissions verified ✓');
} catch (err) {
  console.error('[Downloads] WARNING: No write permissions!', err.message);
}

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ ADD THESE ENDPOINTS TO YOUR app.js ============

// 1. EXPORT HEALTH REPORT AS PDF
app.post('/api/project/:projectId/export-health-pdf', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    // Fetch data
    const [projectInfo] = await dbPool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (projectInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const [workItems] = await dbPool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as ahead,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as \`delayed\`
            FROM work_items WHERE project_id = ?
        `, [projectId]);

    const [materials] = await dbPool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN material_status = 0 THEN 1 ELSE 0 END) as arrived,
                SUM(CASE WHEN material_status = 2 THEN 1 ELSE 0 END) as \`ordered\`,
                SUM(CASE WHEN material_status = 3 THEN 1 ELSE 0 END) as \`delayed\`,
                SUM(qty * COALESCE(unit_price, 0)) as total_cost
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            WHERE wi.project_id = ?
        `, [projectId]);

    const [topMaterials] = await dbPool.query(`
            SELECT 
                material_name,
                vendor,
                SUM(qty) as total_qty,
                unit,
                SUM(qty * COALESCE(unit_price, 0)) as total_cost
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            WHERE wi.project_id = ?
            GROUP BY material_name, vendor, unit
            ORDER BY total_cost DESC
            LIMIT 10
        `, [projectId]);

    // Generate PDF
    const filename = `health-report-${projectId}-${Date.now()}.pdf`;
    const filepath = path.join(downloadsDir, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(24).text('Project Health Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${projectInfo[0].project_name}`, { align: 'center' });
    doc.text(`Owner: ${projectInfo[0].owner}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Work Items Section
    doc.fontSize(16).text('Work Items Status', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total: ${workItems[0].total}`);
    doc.text(`✓ Ahead: ${workItems[0].ahead}`);
    doc.text(`✓ On Time: ${workItems[0].on_time}`);
    doc.text(`⚠ Delayed: ${workItems[0].delayed}`);
    doc.moveDown();

    // Materials Section
    doc.fontSize(16).text('Materials Overview', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Materials: ${materials[0].total}`);
    doc.text(`Arrived: ${materials[0].arrived}`);
    doc.text(`Ordered: ${materials[0].ordered}`);
    doc.text(`Delayed: ${materials[0].delayed}`);
    doc.text(`Total Cost: $${parseFloat(materials[0].total_cost || 0).toFixed(2)}`);
    doc.moveDown();

    // Top Materials Table
    doc.addPage();
    doc.fontSize(16).text('Top 10 Materials by Cost', { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [200, 100, 80, 100];
    const headers = ['Material', 'Vendor', 'Quantity', 'Total Cost'];

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    });

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let y = tableTop + 20;
    topMaterials.forEach(mat => {
      x = 50;
      doc.text(mat.material_name.substring(0, 30), x, y, { width: colWidths[0] });
      doc.text(mat.vendor || 'N/A', x + colWidths[0], y, { width: colWidths[1] });
      doc.text(`${mat.total_qty} ${mat.unit || ''}`, x + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(`$${parseFloat(mat.total_cost || 0).toFixed(2)}`, x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      y += 20;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('Generated by Procura Construction Management System', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      res.json({
        success: true,
        filename,
        download_url: `/downloads/${filename}`
      });
    });

    stream.on('error', (error) => {
      console.error('PDF generation error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    });

  } catch (error) {
    console.error('Export health PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. EXPORT HEALTH REPORT AS EXCEL
app.post('/api/project/:projectId/export-health-excel', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    // Fetch data (same as PDF)
    const [projectInfo] = await dbPool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (projectInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const [workItems] = await dbPool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as ahead,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as on_time,
                SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as \`delayed\`
            FROM work_items WHERE project_id = ?
        `, [projectId]);

    const [materials] = await dbPool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN material_status = 0 THEN 1 ELSE 0 END) as arrived,
                SUM(CASE WHEN material_status = 2 THEN 1 ELSE 0 END) as \`ordered\`,
                SUM(CASE WHEN material_status = 3 THEN 1 ELSE 0 END) as \`delayed\`,
                SUM(qty * COALESCE(unit_price, 0)) as total_cost
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            WHERE wi.project_id = ?
        `, [projectId]);

    const [topMaterials] = await dbPool.query(`
            SELECT 
                material_name,
                vendor,
                SUM(qty) as total_qty,
                unit,
                SUM(qty * COALESCE(unit_price, 0)) as total_cost
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            WHERE wi.project_id = ?
            GROUP BY material_name, vendor, unit
            ORDER BY total_cost DESC
            LIMIT 20
        `, [projectId]);

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Procura System';
    workbook.created = new Date();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { width: 30 },
      { width: 20 }
    ];

    summarySheet.addRow(['Project Health Report']);
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.addRow([]);
    summarySheet.addRow(['Project Name', projectInfo[0].project_name]);
    summarySheet.addRow(['Owner', projectInfo[0].owner]);
    summarySheet.addRow(['Generated', new Date().toLocaleString()]);
    summarySheet.addRow([]);

    summarySheet.addRow(['Work Items']);
    summarySheet.getCell('A7').font = { bold: true };
    summarySheet.addRow(['Total', workItems[0].total]);
    summarySheet.addRow(['Ahead', workItems[0].ahead]);
    summarySheet.addRow(['On Time', workItems[0].on_time]);
    summarySheet.addRow(['Delayed', workItems[0].delayed]);
    summarySheet.addRow([]);

    summarySheet.addRow(['Materials']);
    summarySheet.getCell('A13').font = { bold: true };
    summarySheet.addRow(['Total', materials[0].total]);
    summarySheet.addRow(['Arrived', materials[0].arrived]);
    summarySheet.addRow(['Ordered', materials[0].ordered]);
    summarySheet.addRow(['Delayed', materials[0].delayed]);
    summarySheet.addRow(['Total Cost', `$${parseFloat(materials[0].total_cost || 0).toFixed(2)}`]);

    // Sheet 2: Top Materials
    const materialsSheet = workbook.addWorksheet('Top Materials');
    materialsSheet.columns = [
      { header: 'Material Name', key: 'material_name', width: 40 },
      { header: 'Vendor', key: 'vendor', width: 20 },
      { header: 'Quantity', key: 'total_qty', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Total Cost', key: 'total_cost', width: 15 }
    ];

    materialsSheet.getRow(1).font = { bold: true };

    topMaterials.forEach(mat => {
      materialsSheet.addRow({
        material_name: mat.material_name,
        vendor: mat.vendor || 'N/A',
        total_qty: mat.total_qty,
        unit: mat.unit || '',
        total_cost: `$${parseFloat(mat.total_cost || 0).toFixed(2)}`
      });
    });

    // Save file
    const filename = `health-report-${projectId}-${Date.now()}.xlsx`;
    const filepath = path.join(downloadsDir, filename);
    await workbook.xlsx.writeFile(filepath);

    res.json({
      success: true,
      filename,
      download_url: `/downloads/${filename}`
    });

  } catch (error) {
    console.error('Export health Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. EXPORT COST ANALYSIS AS EXCEL
app.post('/api/project/:projectId/export-cost-excel', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [costs] = await dbPool.query(`
            SELECT 
                mu.material_name,
                mu.vendor,
                SUM(mu.qty) as total_quantity,
                mu.unit,
                AVG(COALESCE(mu.unit_price, 0)) as avg_price,
                SUM(mu.qty * COALESCE(mu.unit_price, 0)) as total_cost
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            WHERE wi.project_id = ?
            GROUP BY mu.material_name, mu.vendor, mu.unit
            ORDER BY total_cost DESC
        `, [projectId]);

    const totalProjectCost = costs.reduce((sum, item) =>
      sum + parseFloat(item.total_cost || 0), 0
    );

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cost Analysis');

    sheet.columns = [
      { header: 'Material', key: 'material_name', width: 40 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Quantity', key: 'total_quantity', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Avg Price', key: 'avg_price', width: 15 },
      { header: 'Total Cost', key: 'total_cost', width: 15 }
    ];

    sheet.getRow(1).font = { bold: true };

    costs.forEach(cost => {
      sheet.addRow({
        material_name: cost.material_name,
        vendor: cost.vendor || 'N/A',
        total_quantity: cost.total_quantity,
        unit: cost.unit || '',
        avg_price: `$${parseFloat(cost.avg_price).toFixed(2)}`,
        total_cost: `$${parseFloat(cost.total_cost).toFixed(2)}`
      });
    });

    sheet.addRow([]);
    const totalRow = sheet.addRow(['', '', '', '', 'TOTAL:', `$${totalProjectCost.toFixed(2)}`]);
    totalRow.font = { bold: true };
    totalRow.getCell(6).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF00' }
    };

    const filename = `cost-analysis-${projectId}-${Date.now()}.xlsx`;
    const filepath = path.join(downloadsDir, filename);
    await workbook.xlsx.writeFile(filepath);

    res.json({
      success: true,
      filename,
      download_url: `/downloads/${filename}`
    });

  } catch (error) {
    console.error('Export cost Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. FILE DOWNLOAD ENDPOINT
app.get('/downloads/:filename', (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(downloadsDir, filename);

  // Security: prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  res.download(filepath, (err) => {
    if (err) {
      console.error('Download error:', err);
    }

    // Delete file after download (1 minute delay)
    setTimeout(() => {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`Deleted temporary file: ${filename}`);
      }
    }, 60000);
  });
});
// --- 中介軟體 (Middleware) ---
// 1. 處理 JSON 格式的請求體 (POST/PUT 請求)
app.use(express.json());
// 2. 處理 URL-encoded 格式的請求體 (常見於表單)
app.use(express.urlencoded({ extended: true }));

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

// --- 一次性修復：更新現有材料價格 ---
async function updateExistingMaterialPrices() {
  try {
    const dbPool = app.locals.dbPool;
    if (!dbPool) {
      console.log('[Price Update] Database pool not ready, skipping...');
      return;
    }

    console.log('[Price Update] Updating existing material prices from Material table...');

    const [result] = await dbPool.query(`
            UPDATE materials_used mu
            JOIN Material m ON LOWER(TRIM(mu.material_name)) = LOWER(TRIM(m.Item_Description))
            SET mu.unit_price = m.PriceAvg
            WHERE m.PriceAvg IS NOT NULL AND mu.unit_price = 0
        `);

    console.log(`[Price Update] Updated ${result.affectedRows} materials with prices.`);

    // Show updated materials
    const [updated] = await dbPool.query(`
            SELECT id, material_name, unit_price 
            FROM materials_used 
            WHERE unit_price > 0
        `);

    if (updated.length > 0) {
      // console.log('[Price Update] Materials with prices:');
      // updated.forEach(m => {
      //   console.log(`  - ID ${m.id}: ${m.material_name} = $${m.unit_price}`);
      // });
      console.log(`[Price Update] Total materials with prices: ${updated.length}`);
    }

  } catch (error) {
    console.error('[Price Update] Error updating prices:', error.message);
  }
}

// 在資料庫初始化後延遲執行價格更新
setTimeout(() => {
  if (app.locals.dbPool) {
    updateExistingMaterialPrices();
  }
}, 2000); // 等待 2 秒確保資料庫連線完成

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
// 19. GET COST ANALYSIS - FIXED VERSION
app.get('/api/project/:projectId/cost-analysis', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [costs] = await dbPool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.qty) as total_quantity,
        mu.unit,
        AVG(COALESCE(mu.unit_price, 0)) as avg_price,
        SUM(mu.qty * COALESCE(mu.unit_price, 0)) as total_cost
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
      ORDER BY total_cost DESC
    `, [projectId]);

    const totalProjectCost = costs.reduce((sum, item) =>
      sum + parseFloat(item.total_cost || 0), 0
    );

    res.json({
      success: true,
      costs: costs,
      totalProjectCost: totalProjectCost.toFixed(2)
    });
  } catch (error) {
    console.error('Get cost analysis error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
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
  const { work_item_id, material_name, vendor, qty, unit } = req.body;
  const dbPool = app.locals.dbPool;
  const default_status = 2;

  if (!work_item_id || !material_name || qty === undefined || qty === null || isNaN(parseFloat(qty))) {
    return res.status(400).json({ success: false, message: '工項 ID、建材名稱和數量是必需的。' });
  }

  try {
    // 🔥 NEW: Fetch the price from Material table
    const [materialData] = await dbPool.execute(
      'SELECT PriceAvg FROM Material WHERE Item_Description = ? LIMIT 1',
      [material_name]
    );

    const unit_price = materialData.length > 0 ? materialData[0].PriceAvg : 0;

    const query = `
            INSERT INTO materials_used 
            (work_item_id, material_name, vendor, qty, unit, material_status, unit_price)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;

    const [result] = await dbPool.execute(query, [
      work_item_id,
      material_name,
      vendor || null,
      qty,
      unit || null,
      default_status,
      unit_price  // 🔥 ADD THIS
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

    const arrivalLogQuery = `
            CREATE TABLE IF NOT EXISTS material_arrival_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                material_id INT NOT NULL,
                expected_date DATE NOT NULL,
                actual_date DATE DEFAULT NULL,
                delivery_status ENUM('pending','in_transit','delivered','delayed') DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE
            );
        `;
    await dbPool.execute(arrivalLogQuery);
    console.log('[MySQL] material_arrival_logs table checked/created.');

  } catch (error) {
    console.error('[MySQL] Failed to init tables:', error);
  }
}
// 在 DB 連線後呼叫
setTimeout(() => {
  if (app.locals.dbPool) initVendorRatingsTable();
}, 2000);


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

// 5. Get Vendor Metrics (Delivery Punctuality & Price Competitiveness)
app.get('/api/vendor-metrics', async (req, res) => {
  const dbPool = app.locals.dbPool;
  try {
    // --- OPTIMIZED QUERY FOR VENDOR METRICS ---

    // 1. Fetch Delivery Metrics (from materials_used & arrival_logs)
    const [deliveryRows] = await dbPool.execute(`
        SELECT 
            mu.vendor,
            COUNT(*) as total_orders,
            SUM(CASE 
                WHEN al.delivery_status = 'delivered' THEN 1
                WHEN al.delivery_status = 'delayed' THEN 0
                WHEN al.actual_date IS NOT NULL AND al.actual_date <= al.expected_date THEN 1
                ELSE 0
            END) as on_time_count
        FROM materials_used mu
        JOIN material_arrival_logs al ON mu.id = al.material_id
        WHERE mu.vendor IS NOT NULL AND mu.vendor != ''
        GROUP BY mu.vendor
    `);

    const deliveryMap = {};
    deliveryRows.forEach(r => {
      deliveryMap[r.vendor] = {
        total: r.total_orders,
        on_time: parseFloat(r.on_time_count),
        pct: Math.round((parseFloat(r.on_time_count) / r.total_orders) * 100)
      };
    });

    // 2. Fetch Price Metrics (from Transaction table - Historical Data)
    // Get average price per material per vendor
    const [priceRows] = await dbPool.execute(`
        SELECT 
            c.name as vendor, 
            m.Item_Description as material_name, 
            AVG(t.price_per_unit) as avg_price
        FROM Transaction t
        JOIN Company c ON t.FK_company_id = c.company_id
        JOIN Material m ON t.FK_material_id = m.material_id
        WHERE t.price_per_unit > 0
        GROUP BY c.name, m.Item_Description
    `);

    // Calculate Market Average per Material (Unweighted average of vendor prices)
    const materialPrices = {}; // { "Cement": [100, 110, 105], ... }
    priceRows.forEach(row => {
      if (!materialPrices[row.material_name]) materialPrices[row.material_name] = [];
      materialPrices[row.material_name].push(parseFloat(row.avg_price));
    });

    const marketAverages = {};
    for (const [mat, prices] of Object.entries(materialPrices)) {
      const sum = prices.reduce((a, b) => a + b, 0);
      marketAverages[mat] = sum / prices.length;
    }

    // Calculate Savings % per Vendor
    const vendorSavings = {}; // { "VendorA": { totalSavings: 20, count: 2 } }

    priceRows.forEach(row => {
      const marketAvg = marketAverages[row.material_name];
      if (marketAvg) {
        const vendorAvg = parseFloat(row.avg_price);
        const savings = ((marketAvg - vendorAvg) / marketAvg) * 100;

        if (!vendorSavings[row.vendor]) vendorSavings[row.vendor] = { sum: 0, count: 0 };
        vendorSavings[row.vendor].sum += savings;
        vendorSavings[row.vendor].count++;
      }
    });

    // 3. Combine Data
    // Get distinct list of vendors from both sources
    const allVendors = new Set([
      ...Object.keys(deliveryMap),
      ...Object.keys(vendorSavings)
    ]);

    const metrics = [];
    allVendors.forEach(vendor => {
      // Delivery Data
      const dData = deliveryMap[vendor] || { total: 0, on_time: 0, pct: "N/A" };

      // Price Data
      let priceCompetitiveness = "N/A";
      if (vendorSavings[vendor]) {
        priceCompetitiveness = (vendorSavings[vendor].sum / vendorSavings[vendor].count).toFixed(1);
      }

      metrics.push({
        vendor_name: vendor,
        delivery: dData,
        price_competitiveness: priceCompetitiveness
      });
    });

    // Sort: Vendors with savings first (desc), then N/A (-9999), then name
    metrics.sort((a, b) => {
      const valA = a.price_competitiveness === 'N/A' ? -9999 : parseFloat(a.price_competitiveness);
      const valB = b.price_competitiveness === 'N/A' ? -9999 : parseFloat(b.price_competitiveness);
      if (valA !== valB) return valB - valA; // Descending
      return a.vendor_name.localeCompare(b.vendor_name);
    });

    res.json({ success: true, metrics });

  } catch (error) {
    console.error('Get Vendor Metrics error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving vendor metrics.' });
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

// ==================== QUALITY SCORE & INSPECTION APIs (Steven's Features) ====================
// Add these to your app.js file

// 1. GET INSPECTION CHECKLIST
app.get('/api/inspection-checklist', async (req, res) => {
  const dbPool = app.locals.dbPool;

  try {
    const [checklist] = await dbPool.query(`
      SELECT * FROM inspection_checklist_items 
      ORDER BY category, item_order
    `);

    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 2. ADD QUALITY SCORE
app.post('/api/materials/:materialId/quality-score', async (req, res) => {
  const { materialId } = req.params;
  const { score, inspector_name, inspection_date, notes } = req.body;
  const dbPool = app.locals.dbPool;

  console.log('Adding quality score for material_id:', materialId);
  console.log('Request body:', req.body);

  if (!score || !inspector_name || !inspection_date) {
    return res.status(400).json({
      success: false,
      message: '分數、檢驗員和日期是必需的'
    });
  }

  if (score < 0 || score > 10) {
    return res.status(400).json({
      success: false,
      message: '分數必須在 0 到 10 之間'
    });
  }

  try {
    // Check if material exists
    const [material] = await dbPool.query(
      'SELECT id, material_name FROM materials_used WHERE id = ?',
      [materialId]
    );

    if (material.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到 ID=${materialId} 的建材`
      });
    }

    const [result] = await dbPool.query(`
      INSERT INTO material_quality_scores 
      (material_id, score, inspector_name, inspection_date, notes) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, score, inspector_name, inspection_date, notes || '']);

    console.log('Quality score added successfully, ID:', result.insertId);

    res.json({
      success: true,
      scoreId: result.insertId,
      message: '品質分數新增成功'
    });
  } catch (error) {
    console.error('Add quality score error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 3. GET QUALITY HISTORY FOR A MATERIAL
app.get('/api/materials/:materialId/quality-history', async (req, res) => {
  const { materialId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [history] = await dbPool.query(`
      SELECT * FROM material_quality_scores 
      WHERE material_id = ? 
      ORDER BY inspection_date DESC
    `, [materialId]);

    res.json({ success: true, history });
  } catch (error) {
    console.error('Get quality history error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 4. SUBMIT INSPECTION CHECKLIST
app.post('/api/materials/:materialId/inspection', async (req, res) => {
  const { materialId } = req.params;
  const { inspector_name, inspection_date, checklist_results, overall_pass } = req.body;
  const dbPool = app.locals.dbPool;

  if (!inspector_name || !inspection_date || !checklist_results) {
    return res.status(400).json({
      success: false,
      message: '檢驗員、日期和檢查結果是必需的'
    });
  }

  try {
    // Check if material exists
    const [material] = await dbPool.query(
      'SELECT id FROM materials_used WHERE id = ?',
      [materialId]
    );

    if (material.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該建材'
      });
    }

    const [result] = await dbPool.query(`
      INSERT INTO material_inspections 
      (material_id, inspector_name, inspection_date, checklist_results, overall_pass) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      materialId,
      inspector_name,
      inspection_date,
      JSON.stringify(checklist_results),
      overall_pass ? 1 : 0
    ]);

    res.json({
      success: true,
      inspectionId: result.insertId,
      message: '檢驗結果提交成功'
    });
  } catch (error) {
    console.error('Add inspection error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 5. GET ALL DEFECT REPORTS FOR A PROJECT
app.get('/api/project/:projectId/defect-reports', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [reports] = await dbPool.query(`
      SELECT 
        dr.*,
        mu.material_name,
        mu.vendor
      FROM material_defect_reports dr
      JOIN materials_used mu ON dr.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY dr.report_date DESC
    `, [projectId]);

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Get defect reports error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 6. SUBMIT DEFECT REPORT
app.post('/api/materials/:materialId/defect-report', async (req, res) => {
  const { materialId } = req.params;
  const { defect_type, severity, description, reported_by, report_date } = req.body;
  const dbPool = app.locals.dbPool;

  if (!defect_type || !severity || !description || !reported_by || !report_date) {
    return res.status(400).json({
      success: false,
      message: '所有欄位都是必需的'
    });
  }

  try {
    // Check if material exists
    const [material] = await dbPool.query(
      'SELECT id FROM materials_used WHERE id = ?',
      [materialId]
    );

    if (material.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該建材'
      });
    }

    const [result] = await dbPool.query(`
      INSERT INTO material_defect_reports 
      (material_id, defect_type, severity, description, reported_by, report_date, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `, [materialId, defect_type, severity, description, reported_by, report_date]);

    res.json({
      success: true,
      reportId: result.insertId,
      message: '瑕疵報告提交成功'
    });
  } catch (error) {
    console.error('Add defect report error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 7. ADD MATERIAL TEST RESULT
app.post('/api/materials/:materialId/test-results', async (req, res) => {
  const { materialId } = req.params;
  const { test_type, test_date, result_value, pass_fail, tester_name, notes } = req.body;
  const dbPool = app.locals.dbPool;

  if (!test_type || !test_date || !pass_fail || !tester_name) {
    return res.status(400).json({
      success: false,
      message: '測試類型、日期、結果和測試員是必需的'
    });
  }

  try {
    const [result] = await dbPool.query(`
      INSERT INTO material_test_results 
      (material_id, test_type, test_date, result_value, pass_fail, tester_name, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [materialId, test_type, test_date, result_value || '', pass_fail, tester_name, notes || '']);

    res.json({
      success: true,
      testId: result.insertId,
      message: '測試結果新增成功'
    });
  } catch (error) {
    console.error('Add test result error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 8. GET TEST RESULTS FOR A MATERIAL
app.get('/api/materials/:materialId/test-results', async (req, res) => {
  const { materialId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [results] = await dbPool.query(`
      SELECT * FROM material_test_results 
      WHERE material_id = ? 
      ORDER BY test_date DESC
    `, [materialId]);

    res.json({ success: true, results });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 9. GET ALL MATERIALS WITH QUALITY METRICS (for Quality Overview)
app.get('/api/project/:projectId/materials-quality-overview', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [materials] = await dbPool.query(`
      SELECT 
        mu.id as material_id,
        mu.material_name,
        mu.vendor,
        mu.qty,
        mu.unit,
        wi.name as work_item_name,
        wi.work_date,
        AVG(qs.score) as avg_quality_score,
        COUNT(DISTINCT qs.id) as quality_score_count,
        COUNT(DISTINCT dr.id) as defect_count,
        COUNT(DISTINCT tr.id) as test_count
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_quality_scores qs ON mu.id = qs.material_id
      LEFT JOIN material_defect_reports dr ON mu.id = dr.material_id AND dr.status IN ('open', 'investigating')
      LEFT JOIN material_test_results tr ON mu.id = tr.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.id, mu.material_name, mu.vendor, mu.qty, mu.unit, wi.name, wi.work_date
      ORDER BY wi.work_date DESC, mu.material_name
    `, [projectId]);

    res.json({ success: true, materials });
  } catch (error) {
    console.error('Get materials quality overview error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});
// ============ AI QUERY PROXY ENDPOINT (REAL AI VERSION) ============
app.post('/api/ai/query', async (req, res) => {
  const { query, context } = req.body;

  if (!query) {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }

  try {
    console.log('AI Query received:', query);

    // Build a detailed prompt from the context
    const prompt = buildAIPrompt(query, context);

    // Call Claude API (requires API key)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "YOUR_API_KEY_HERE",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({
      success: false,
      message: 'AI query failed: ' + error.message
    });
  }
});

// Helper function to build AI prompt from context
function buildAIPrompt(query, context) {
  const totalMaterials = context.total_materials || 0;
  const vendors = context.vendors || [];
  const materialsSummary = context.materials_summary || [];

  let prompt = `You are a construction project management AI assistant. Analyze the following project data and answer the user's question.

USER QUESTION: "${query}"

PROJECT DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 OVERVIEW:
- Total Materials Tracked: ${totalMaterials}
- Active Vendors: ${vendors.length}

`;

  // Add vendor performance data
  if (vendors.length > 0) {
    prompt += `👥 VENDOR PERFORMANCE:\n`;
    vendors.forEach((v, i) => {
      const onTimeRate = (v.on_time_deliveries / v.total_deliveries * 100).toFixed(1);
      prompt += `${i + 1}. ${v.name}
   • Total Deliveries: ${v.total_deliveries}
   • On-Time: ${v.on_time_deliveries} (${onTimeRate}%)
   • Quality Score: ${parseFloat(v.avg_quality_score).toFixed(1)}/10
   • Defects: ${v.defect_count}
`;
    });
    prompt += '\n';
  }

  // Add material details
  if (materialsSummary.length > 0) {
    prompt += `📦 TOP MATERIALS:\n`;
    materialsSummary.slice(0, 10).forEach((m, i) => {
      const statusLabel = getStatusLabel(m.material_status);
      prompt += `${i + 1}. ${m.material_name}
   • Quantity: ${m.qty} ${m.unit || 'units'}
   • Vendor: ${m.vendor || 'Not specified'}
   • Price: $${(m.unit_price || 0).toFixed(2)} per unit
   • Total Value: $${((m.qty * (m.unit_price || 0))).toFixed(2)}
   • Status: ${statusLabel}
`;
    });

    // Add status summary
    const arrived = materialsSummary.filter(m => m.material_status === 0).length;
    const ordered = materialsSummary.filter(m => m.material_status === 2).length;
    const delayed = materialsSummary.filter(m => m.material_status === 3).length;

    prompt += `\n📋 STATUS SUMMARY:
- Arrived: ${arrived}
- Ordered: ${ordered}
- Delayed: ${delayed}
`;

    // Add cost summary
    const totalCost = materialsSummary.reduce((sum, m) =>
      sum + (m.qty * (m.unit_price || 0)), 0
    );

    prompt += `\n💰 COST SUMMARY:
- Total Material Cost: $${totalCost.toFixed(2)}
- Materials with Pricing: ${materialsSummary.filter(m => m.unit_price > 0).length}/${totalMaterials}
`;
  }

  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS:
1. Analyze the data above carefully
2. Answer the user's question with specific insights from the data
3. Use actual numbers, vendor names, and material details
4. Provide actionable recommendations when relevant
5. Format your response clearly with sections and bullet points
6. If the data shows risks or issues, highlight them prominently

Keep your response focused and under 400 words.`;

  return prompt;
}

// Helper function to convert status codes to labels
function getStatusLabel(status) {
  const labels = {
    0: '✅ Arrived',
    1: '📦 In Transit',
    2: '🔄 Ordered',
    3: '⚠️ Delayed'
  };
  return labels[status] || 'Unknown';
}

// ==================== REPORTS & ALERTS SYSTEM (Steven's Advanced Features) ====================
// Add these to your app.js file

// ============ PREDICTIVE ALERTS ============

// 1. GET ALL ACTIVE ALERTS FOR A PROJECT
app.get('/api/project/:projectId/alerts', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const alerts = [];

    // ALERT TYPE 1: Delayed Material Deliveries
    const [delayedMaterials] = await dbPool.query(`
      SELECT 
        al.*,
        mu.id as material_id,
        mu.material_name,
        mu.vendor,
        mu.qty,
        wi.name as work_item_name,
        wi.work_date,
        DATEDIFF(CURDATE(), al.expected_date) as days_overdue
      FROM material_arrival_logs al
      JOIN materials_used mu ON al.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ? 
        AND al.delivery_status NOT IN ('delivered')
        AND al.expected_date < CURDATE()
      ORDER BY days_overdue DESC
      LIMIT 10
    `, [projectId]);

    delayedMaterials.forEach(m => {
      alerts.push({
        id: `delay-material-${m.id}`,
        type: 'material_delay',
        severity: m.days_overdue > 7 ? 'critical' : m.days_overdue > 3 ? 'high' : 'medium',
        title: `Material Delivery Overdue`,
        message: `${m.material_name} from ${m.vendor || 'Unknown'} is ${m.days_overdue} days overdue`,
        details: {
          material_id: m.material_id,
          material_name: m.material_name,
          vendor: m.vendor,
          expected_date: m.expected_date,
          days_overdue: m.days_overdue,
          work_item: m.work_item_name,
          quantity: m.qty
        },
        action_required: true,
        created_at: new Date().toISOString()
      });
    });

    // ALERT TYPE 2: Work Items at Risk (Approaching deadline with dependencies)
    const [riskyWorkItems] = await dbPool.query(`
      SELECT 
        wi.*,
        DATEDIFF(wi.work_date, CURDATE()) as days_until,
        COUNT(mu.id) as material_count,
        SUM(CASE WHEN mu.material_status IN (1,2,3) THEN 1 ELSE 0 END) as pending_materials
      FROM work_items wi
      LEFT JOIN materials_used mu ON wi.id = mu.work_item_id
      WHERE wi.project_id = ?
        AND wi.work_date > CURDATE()
        AND wi.work_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
        AND wi.status != 0
      GROUP BY wi.id
      HAVING pending_materials > 0
      ORDER BY days_until ASC
    `, [projectId]);

    riskyWorkItems.forEach(w => {
      const riskLevel = w.days_until <= 3 ? 'critical' : w.days_until <= 7 ? 'high' : 'medium';
      alerts.push({
        id: `risk-workitem-${w.id}`,
        type: 'work_item_risk',
        severity: riskLevel,
        title: `Work Item at Risk`,
        message: `"${w.name}" starts in ${w.days_until} days but has ${w.pending_materials} pending materials`,
        details: {
          work_item_id: w.id,
          work_item_name: w.name,
          work_date: w.work_date,
          days_until: w.days_until,
          total_materials: w.material_count,
          pending_materials: w.pending_materials
        },
        action_required: true,
        created_at: new Date().toISOString()
      });
    });

    // ALERT TYPE 3: Budget Overruns (Cost exceeding projections)
    const [costData] = await dbPool.query(`
      SELECT 
        SUM(mu.qty * COALESCE(mu.unit_price, 0)) as current_cost,
        COUNT(mu.id) as materials_with_price,
        COUNT(*) as total_materials
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
    `, [projectId]);

    if (costData[0] && costData[0].current_cost > 0) {
      const avgCostPerMaterial = costData[0].current_cost / costData[0].materials_with_price;
      const projectedTotal = avgCostPerMaterial * costData[0].total_materials;
      const overrun = projectedTotal - costData[0].current_cost;

      if (overrun > costData[0].current_cost * 0.15) { // 15% over budget
        alerts.push({
          id: `budget-overrun-${projectId}`,
          type: 'budget_risk',
          severity: overrun > costData[0].current_cost * 0.3 ? 'critical' : 'high',
          title: `Potential Budget Overrun Detected`,
          message: `Project may exceed budget by $${overrun.toFixed(2)} (${((overrun / costData[0].current_cost) * 100).toFixed(1)}%)`,
          details: {
            current_cost: costData[0].current_cost,
            projected_cost: projectedTotal,
            potential_overrun: overrun,
            materials_tracked: costData[0].total_materials
          },
          action_required: true,
          created_at: new Date().toISOString()
        });
      }
    }

    // ALERT TYPE 4: Quality Issues (Multiple defects from same vendor/material)
    const [qualityIssues] = await dbPool.query(`
      SELECT 
        mu.vendor,
        COUNT(DISTINCT dr.id) as defect_count,
        GROUP_CONCAT(DISTINCT mu.material_name) as affected_materials,
        MAX(dr.severity) as max_severity
      FROM material_defect_reports dr
      JOIN materials_used mu ON dr.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
        AND dr.status IN ('open', 'investigating')
      GROUP BY mu.vendor
      HAVING defect_count >= 2
      ORDER BY defect_count DESC
    `, [projectId]);

    qualityIssues.forEach(q => {
      alerts.push({
        id: `quality-${q.vendor}`,
        type: 'quality_issue',
        severity: q.max_severity === 'critical' ? 'critical' : q.max_severity === 'high' ? 'high' : 'medium',
        title: `Recurring Quality Issues`,
        message: `${q.defect_count} defects reported from vendor ${q.vendor || 'Unknown'}`,
        details: {
          vendor: q.vendor,
          defect_count: q.defect_count,
          affected_materials: q.affected_materials,
          max_severity: q.max_severity
        },
        action_required: true,
        created_at: new Date().toISOString()
      });
    });

    // ALERT TYPE 5: Low Inventory Warning (Stock running out)
    const [lowStock] = await dbPool.query(`
      SELECT 
        mu.id as material_id,
        mu.material_name,
        mu.vendor,
        mu.qty as total_needed,
        COALESCE(SUM(mi.quantity_received), 0) as received,
        (mu.qty - COALESCE(SUM(mi.quantity_received), 0)) as remaining,
        mu.unit,
        wi.work_date
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
        AND wi.work_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND wi.work_date >= CURDATE()
      GROUP BY mu.id, mu.material_name, mu.vendor, mu.qty, mu.unit, wi.work_date
      HAVING remaining > total_needed * 0.5
      ORDER BY wi.work_date ASC
    `, [projectId]);

    lowStock.forEach(s => {
      const urgency = s.remaining >= s.total_needed * 0.8 ? 'critical' : 'high';
      alerts.push({
        id: `stock-${s.material_id}`,
        type: 'inventory_low',
        severity: urgency,
        title: `Low Stock Alert`,
        message: `${s.material_name} needed in ${Math.ceil((new Date(s.work_date) - new Date()) / (1000 * 60 * 60 * 24))} days but only ${((1 - s.remaining / s.total_needed) * 100).toFixed(0)}% received`,
        details: {
          material_id: s.material_id,
          material_name: s.material_name,
          vendor: s.vendor,
          total_needed: s.total_needed,
          received: s.received,
          remaining: s.remaining,
          unit: s.unit,
          work_date: s.work_date
        },
        action_required: true,
        created_at: new Date().toISOString()
      });
    });

    // Sort by severity and limit to top 20 most critical
    const severityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.json({
      success: true,
      alerts: alerts.slice(0, 20),
      total_alerts: alerts.length,
      critical_count: alerts.filter(a => a.severity === 'critical').length,
      high_count: alerts.filter(a => a.severity === 'high').length
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 2. DISMISS/ACKNOWLEDGE ALERT
app.post('/api/alerts/:alertId/acknowledge', async (req, res) => {
  const { alertId } = req.params;
  const { acknowledged_by, notes } = req.body;
  const dbPool = app.locals.dbPool;

  try {
    // Store acknowledgment in alerts_acknowledgments table
    const [result] = await dbPool.query(`
      INSERT INTO alerts_acknowledgments 
      (alert_id, acknowledged_by, notes, acknowledged_at)
      VALUES (?, ?, ?, NOW())
    `, [alertId, acknowledged_by, notes || '']);

    res.json({
      success: true,
      message: 'Alert acknowledged',
      acknowledgment_id: result.insertId
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// ============ COMPREHENSIVE REPORTS ============

// 3. GENERATE PROJECT HEALTH REPORT
app.get('/api/project/:projectId/report/health', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    // Get project basic info
    const [projectInfo] = await dbPool.query(`
      SELECT * FROM projects WHERE id = ?
    `, [projectId]);

    if (projectInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Work Items Summary
    const [workItemsStats] = await dbPool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as ahead,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as \`delayed\`,
        SUM(CASE WHEN work_date < CURDATE() THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN work_date >= CURDATE() THEN 1 ELSE 0 END) as upcoming
      FROM work_items
      WHERE project_id = ?
    `, [projectId]);

    // Materials Summary - FIXED with correct status mapping
    const [materialsStats] = await dbPool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN material_status = 0 THEN 1 ELSE 0 END) as arrived,
        SUM(CASE WHEN material_status = 1 THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN material_status = 2 THEN 1 ELSE 0 END) as \`ordered\`,
        SUM(CASE WHEN material_status = 3 THEN 1 ELSE 0 END) as \`delayed\`,
        SUM(qty * COALESCE(unit_price, 0)) as total_cost
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
    `, [projectId]);

    // Quality Summary
    const [qualityStats] = await dbPool.query(`
      SELECT 
        AVG(score) as avg_quality_score,
        COUNT(*) as total_inspections,
        COUNT(DISTINCT material_id) as materials_inspected
      FROM material_quality_scores qs
      JOIN materials_used mu ON qs.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
    `, [projectId]);

    // Defects Summary
    const [defectsStats] = await dbPool.query(`
      SELECT 
        COUNT(*) as total_defects,
        SUM(CASE WHEN dr.severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN dr.severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN dr.status = 'open' THEN 1 ELSE 0 END) as open_defects 
      FROM material_defect_reports dr
      JOIN materials_used mu ON dr.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
    `, [projectId]);

    // Vendor Performance
    const [vendorStats] = await dbPool.query(`
      SELECT 
        COUNT(DISTINCT vendor) as total_vendors,
        AVG(CASE 
          WHEN al.delivery_status = 'delivered' AND al.actual_date <= al.expected_date 
          THEN 1 ELSE 0 
        END) * 100 as avg_on_time_rate
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_arrival_logs al ON mu.id = al.material_id
      WHERE wi.project_id = ?
    `, [projectId]);

    // Calculate overall health score (0-100)
    const workItemScore = ((workItemsStats[0].ahead + workItemsStats[0].on_time) / workItemsStats[0].total) * 100 || 0;
    const materialScore = ((materialsStats[0].arrived) / materialsStats[0].total) * 100 || 0;
    const qualityScore = (qualityStats[0].avg_quality_score / 10) * 100 || 0;
    const defectScore = Math.max(0, 100 - (defectsStats[0].open_defects * 10));

    const overallHealth = (workItemScore * 0.4 + materialScore * 0.3 + qualityScore * 0.2 + defectScore * 0.1);

    const report = {
      project: {
        id: projectInfo[0].id,
        name: projectInfo[0].project_name,
        owner: projectInfo[0].owner,
        tags: projectInfo[0].tags
      },
      health_score: {
        overall: overallHealth.toFixed(1),
        status: overallHealth >= 80 ? 'excellent' :
          overallHealth >= 60 ? 'good' :
            overallHealth >= 40 ? 'fair' : 'poor',
        components: {
          work_items: workItemScore.toFixed(1),
          materials: materialScore.toFixed(1),
          quality: qualityScore.toFixed(1),
          defects: defectScore.toFixed(1)
        }
      },
      work_items: workItemsStats[0],
      materials: materialsStats[0],
      quality: qualityStats[0],
      defects: defectsStats[0],
      vendors: vendorStats[0],
      generated_at: new Date().toISOString()
    };

    res.json({ success: true, report });

  } catch (error) {
    console.error('Generate health report error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// 4. GENERATE PREDICTIVE DELAY REPORT
app.get('/api/project/:projectId/report/predictions', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const predictions = {
      project_id: projectId,
      analysis_date: new Date().toISOString(),
      predictions: []
    };

    // PREDICTION 1: Work items likely to be delayed
    const [atRiskItems] = await dbPool.query(`
      SELECT 
        wi.*,
        COUNT(mu.id) as total_materials,
        SUM(CASE WHEN mu.material_status IN (1,2,3) THEN 1 ELSE 0 END) as pending_materials,
        DATEDIFF(wi.work_date, CURDATE()) as days_until,
        AVG(al.days_delayed) as avg_vendor_delay
      FROM work_items wi
      LEFT JOIN materials_used mu ON wi.id = mu.work_item_id
      LEFT JOIN (
        SELECT material_id, AVG(DATEDIFF(actual_date, expected_date)) as days_delayed
        FROM material_arrival_logs
        WHERE delivery_status = 'delivered'
        GROUP BY material_id
      ) al ON mu.id = al.material_id
      WHERE wi.project_id = ?
        AND wi.work_date > CURDATE()
        AND wi.status != 0
      GROUP BY wi.id
      HAVING pending_materials > 0 OR days_until < 7
      ORDER BY days_until ASC
    `, [projectId]);

    atRiskItems.forEach(item => {
      const riskScore = calculateDelayRisk(
        item.pending_materials,
        item.total_materials,
        item.days_until,
        item.avg_vendor_delay
      );

      if (riskScore >= 50) {
        predictions.predictions.push({
          type: 'work_item_delay',
          target: `Work Item: ${item.name}`,
          likelihood: riskScore >= 80 ? 'very_high' : riskScore >= 60 ? 'high' : 'medium',
          risk_score: riskScore,
          factors: [
            `${item.pending_materials}/${item.total_materials} materials not yet received`,
            `Scheduled in ${item.days_until} days`,
            item.avg_vendor_delay > 0 ? `Historical vendor delay: ${item.avg_vendor_delay.toFixed(1)} days` : null
          ].filter(Boolean),
          impact: item.days_until < 3 ? 'critical' : item.days_until < 7 ? 'high' : 'medium',
          recommendation: generateDelayRecommendation(item)
        });
      }
    });

    // PREDICTION 2: Budget overrun forecast
    const [budgetData] = await dbPool.query(`
      SELECT 
        SUM(mu.qty * COALESCE(mu.unit_price, 0)) as current_cost,
        COUNT(CASE WHEN mu.unit_price > 0 THEN 1 END) as priced_materials,
        COUNT(*) as total_materials,
        AVG(mu.unit_price) as avg_price
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
    `, [projectId]);

    if (budgetData[0] && budgetData[0].priced_materials > 0) {
      const currentCost = budgetData[0].current_cost;
      const pricedRatio = budgetData[0].priced_materials / budgetData[0].total_materials;
      const projectedCost = currentCost / pricedRatio;
      const overrunPercent = ((projectedCost - currentCost) / currentCost) * 100;

      if (overrunPercent > 10) {
        predictions.predictions.push({
          type: 'budget_overrun',
          target: 'Project Budget',
          likelihood: overrunPercent > 30 ? 'very_high' : overrunPercent > 20 ? 'high' : 'medium',
          risk_score: Math.min(100, overrunPercent * 2),
          factors: [
            `Current cost: $${currentCost.toFixed(2)}`,
            `Projected final cost: $${projectedCost.toFixed(2)}`,
            `${((1 - pricedRatio) * 100).toFixed(0)}% of materials not yet priced`
          ],
          impact: 'high',
          recommendation: `Review material pricing and negotiate with vendors. Consider cost-saving alternatives for remaining ${budgetData[0].total_materials - budgetData[0].priced_materials} materials.`
        });
      }
    }

    // PREDICTION 3: Quality degradation warning
    const [qualityTrend] = await dbPool.query(`
      SELECT 
        DATE_FORMAT(inspection_date, '%Y-%m') as month,
        AVG(score) as avg_score
      FROM material_quality_scores qs
      JOIN materials_used mu ON qs.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 3
    `, [projectId]);

    if (qualityTrend.length >= 2) {
      const recentScore = qualityTrend[0].avg_score;
      const previousScore = qualityTrend[1].avg_score;
      const decline = previousScore - recentScore;

      if (decline > 1) {
        predictions.predictions.push({
          type: 'quality_decline',
          target: 'Overall Quality Standards',
          likelihood: decline > 2 ? 'high' : 'medium',
          risk_score: Math.min(100, decline * 20),
          factors: [
            `Quality score dropped from ${previousScore.toFixed(1)} to ${recentScore.toFixed(1)}`,
            `Decline of ${decline.toFixed(1)} points detected`
          ],
          impact: decline > 2 ? 'high' : 'medium',
          recommendation: 'Conduct vendor review meetings, implement stricter quality controls, and increase inspection frequency.'
        });
      }
    }

    res.json({ success: true, predictions });

  } catch (error) {
    console.error('Generate predictions error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});

// Helper function to calculate delay risk
function calculateDelayRisk(pendingMaterials, totalMaterials, daysUntil, avgVendorDelay) {
  let risk = 0;

  // Factor 1: Material readiness (0-40 points)
  if (totalMaterials > 0) {
    const pendingRatio = pendingMaterials / totalMaterials;
    risk += pendingRatio * 40;
  }

  // Factor 2: Time pressure (0-40 points)
  if (daysUntil <= 0) risk += 40;
  else if (daysUntil <= 3) risk += 35;
  else if (daysUntil <= 7) risk += 25;
  else if (daysUntil <= 14) risk += 15;
  else risk += 5;

  // Factor 3: Historical vendor performance (0-20 points)
  if (avgVendorDelay > 5) risk += 20;
  else if (avgVendorDelay > 3) risk += 15;
  else if (avgVendorDelay > 1) risk += 10;
  else if (avgVendorDelay > 0) risk += 5;

  return Math.min(100, risk);
}

// Helper function to generate recommendations
function generateDelayRecommendation(item) {
  const recommendations = [];

  if (item.pending_materials > 0) {
    recommendations.push(`Contact vendors to expedite ${item.pending_materials} pending materials`);
  }

  if (item.days_until < 3) {
    recommendations.push('Consider rescheduling or allocating additional resources');
  }

  if (item.avg_vendor_delay > 2) {
    recommendations.push('Source backup vendors for critical materials');
  }

  return recommendations.join('. ') || 'Monitor closely and update status regularly.';
}

// 5. EXPORT REPORT AS PDF/EXCEL (Metadata endpoint - actual file generation would use libraries)
app.post('/api/project/:projectId/report/export', async (req, res) => {
  const { projectId } = req.params;
  const { format, report_type } = req.body; // format: 'pdf' | 'excel', report_type: 'health' | 'predictions' | 'full'

  // In production, this would generate actual PDF/Excel files using libraries like:
  // - pdfkit or puppeteer for PDF
  // - exceljs for Excel

  res.json({
    success: true,
    message: 'Report export queued',
    download_url: `/downloads/project-${projectId}-${report_type}-${Date.now()}.${format}`,
    estimated_time: '30 seconds'
  });
});
// ============ ADD THESE EXPORT ENDPOINTS TO YOUR app.js ============

// 5. EXPORT PREDICTIONS REPORT AS PDF
app.post('/api/project/:projectId/export-predictions-pdf', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    // Fetch predictions data
    const response = await fetch(`http://localhost:${PORT}/api/project/${projectId}/report/predictions`);
    const data = await response.json();

    if (!data.success) {
      return res.status(404).json({ success: false, message: 'Predictions data not found' });
    }

    const { predictions } = data;
    const [projectInfo] = await dbPool.query('SELECT * FROM projects WHERE id = ?', [projectId]);

    // Generate PDF
    const filename = `predictions-report-${projectId}-${Date.now()}.pdf`;
    const filepath = path.join(downloadsDir, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(24).text('Predictive Analysis Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${projectInfo[0].project_name}`, { align: 'center' });
    doc.text(`Analysis Date: ${new Date(predictions.analysis_date).toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Predictions
    if (predictions.predictions.length === 0) {
      doc.fontSize(14).text('✅ No significant risks detected. Project is on track!', { align: 'center' });
    } else {
      doc.fontSize(16).text('Risk Predictions', { underline: true });
      doc.moveDown();

      predictions.predictions.forEach((pred, index) => {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`${index + 1}. ${pred.target}`, { continued: false });

        doc.font('Helvetica').fontSize(10);
        doc.text(`   Likelihood: ${pred.likelihood.replace('_', ' ').toUpperCase()}`);
        doc.text(`   Risk Score: ${pred.risk_score}/100`);
        doc.text(`   Impact: ${pred.impact.toUpperCase()}`);

        doc.text('   Risk Factors:', { underline: true });
        pred.factors.forEach(factor => {
          doc.text(`      • ${factor}`);
        });

        doc.text('   Recommendation:', { underline: true });
        doc.text(`      ${pred.recommendation}`);
        doc.moveDown();

        if (doc.y > 700) {
          doc.addPage();
        }
      });
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('Generated by Procura Construction Management System', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      res.json({
        success: true,
        filename,
        download_url: `/downloads/${filename}`
      });
    });

    stream.on('error', (error) => {
      console.error('PDF generation error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    });

  } catch (error) {
    console.error('Export predictions PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. EXPORT QUALITY REPORT AS PDF
app.post('/api/project/:projectId/export-quality-pdf', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [materials] = await dbPool.query(`
            SELECT 
                mu.id as material_id,
                mu.material_name,
                mu.vendor,
                AVG(qs.score) as avg_quality_score,
                COUNT(DISTINCT qs.id) as quality_score_count,
                COUNT(DISTINCT dr.id) as defect_count,
                COUNT(DISTINCT tr.id) as test_count
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            LEFT JOIN material_quality_scores qs ON mu.id = qs.material_id
            LEFT JOIN material_defect_reports dr ON mu.id = dr.material_id
            LEFT JOIN material_test_results tr ON mu.id = tr.material_id
            WHERE wi.project_id = ?
            GROUP BY mu.id, mu.material_name, mu.vendor
            ORDER BY mu.material_name
        `, [projectId]);

    const [projectInfo] = await dbPool.query('SELECT * FROM projects WHERE id = ?', [projectId]);

    // Generate PDF
    const filename = `quality-report-${projectId}-${Date.now()}.pdf`;
    const filepath = path.join(downloadsDir, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(24).text('Quality Control Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${projectInfo[0].project_name}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Statistics
    const avgQuality = materials.reduce((sum, m) => sum + parseFloat(m.avg_quality_score || 0), 0) / materials.length;
    const totalDefects = materials.reduce((sum, m) => sum + m.defect_count, 0);
    const totalTests = materials.reduce((sum, m) => sum + m.test_count, 0);

    doc.fontSize(14).text('Quality Summary', { underline: true });
    doc.fontSize(11);
    doc.text(`Total Materials: ${materials.length}`);
    doc.text(`Average Quality Score: ${avgQuality.toFixed(1)}/10`);
    doc.text(`Total Defects: ${totalDefects}`);
    doc.text(`Total Tests Performed: ${totalTests}`);
    doc.moveDown(2);

    // Materials Table
    doc.addPage();
    doc.fontSize(14).text('Materials Quality Details', { underline: true });
    doc.moveDown();

    const tableTop = doc.y;
    const colWidths = [150, 100, 60, 60, 60];
    const headers = ['Material', 'Vendor', 'Avg Score', 'Inspections', 'Defects'];

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    let x = 50;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    });

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let y = tableTop + 20;
    materials.forEach(mat => {
      x = 50;
      doc.text(mat.material_name.substring(0, 25), x, y, { width: colWidths[0] });
      doc.text(mat.vendor || 'N/A', x + colWidths[0], y, { width: colWidths[1] });
      doc.text(`${parseFloat(mat.avg_quality_score || 0).toFixed(1)}/10`, x + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(mat.quality_score_count.toString(), x + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(mat.defect_count.toString(), x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
      y += 20;

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.moveDown(2);
    doc.fontSize(8).text('Generated by Procura Construction Management System', { align: 'center' });

    doc.end();

    stream.on('finish', () => {
      res.json({
        success: true,
        filename,
        download_url: `/downloads/${filename}`
      });
    });

    stream.on('error', (error) => {
      console.error('PDF generation error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    });

  } catch (error) {
    console.error('Export quality PDF error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. EXPORT VENDOR REPORT AS EXCEL
app.post('/api/project/:projectId/export-vendors-excel', async (req, res) => {
  const dbPool = app.locals.dbPool;

  try {
    const response = await fetch(`http://localhost:${PORT}/api/vendor-performance`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch vendor performance data');
    }

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Procura System';
    workbook.created = new Date();

    data.data.forEach(category => {
      const sheet = workbook.addWorksheet(category.category.substring(0, 30)); // Excel sheet name limit

      sheet.columns = [
        { header: 'Vendor Name', key: 'vendor_name', width: 30 },
        { header: 'Order Count', key: 'order_count', width: 15 },
        { header: 'Avg Rating', key: 'avg_rating', width: 12 },
        { header: 'Reviews', key: 'rating_count', width: 12 }
      ];

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };

      category.vendors.forEach(vendor => {
        sheet.addRow({
          vendor_name: vendor.vendor_name,
          order_count: vendor.order_count,
          avg_rating: `${vendor.avg_rating}/5`,
          rating_count: vendor.rating_count
        });
      });
    });

    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { width: 30 },
      { width: 20 }
    ];

    summarySheet.addRow(['Vendor Performance Report']);
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.addRow([]);
    summarySheet.addRow(['Generated', new Date().toLocaleString()]);
    summarySheet.addRow(['Total Categories', data.data.length]);

    const filename = `vendor-performance-${Date.now()}.xlsx`;
    const filepath = path.join(downloadsDir, filename);
    await workbook.xlsx.writeFile(filepath);

    res.json({
      success: true,
      filename,
      download_url: `/downloads/${filename}`
    });

  } catch (error) {
    console.error('Export vendors Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. EXPORT INVENTORY REPORT AS EXCEL
app.post('/api/project/:projectId/export-inventory-excel', async (req, res) => {
  const { projectId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [inventory] = await dbPool.query(`
            SELECT 
                mu.id as material_id,
                mu.material_name,
                mu.vendor,
                mu.qty as total_ordered,
                COALESCE(SUM(mi.quantity_received), 0) as total_received,
                (mu.qty - COALESCE(SUM(mi.quantity_received), 0)) as remaining,
                mu.unit,
                mu.material_status,
                wi.work_date,
                wi.name as work_item_name
            FROM materials_used mu
            JOIN work_items wi ON mu.work_item_id = wi.id
            LEFT JOIN material_inventory mi ON mu.id = mi.material_id
            WHERE wi.project_id = ?
            GROUP BY mu.id, mu.material_name, mu.vendor, mu.qty, mu.unit, mu.material_status, wi.work_date, wi.name
            ORDER BY mu.material_name
        `, [projectId]);

    const [projectInfo] = await dbPool.query('SELECT * FROM projects WHERE id = ?', [projectId]);

    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Status');

    sheet.columns = [
      { header: 'Material', key: 'material_name', width: 35 },
      { header: 'Vendor', key: 'vendor', width: 25 },
      { header: 'Ordered', key: 'total_ordered', width: 12 },
      { header: 'Received', key: 'total_received', width: 12 },
      { header: 'Remaining', key: 'remaining', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: '% Received', key: 'percent_received', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Work Item', key: 'work_item_name', width: 25 },
      { header: 'Work Date', key: 'work_date', width: 12 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

    const statusLabels = {
      0: 'Arrived',
      1: 'In Transit',
      2: 'Ordered',
      3: 'Delayed'
    };

    inventory.forEach(item => {
      const percentReceived = (item.total_received / item.total_ordered) * 100;
      const row = sheet.addRow({
        material_name: item.material_name,
        vendor: item.vendor || 'N/A',
        total_ordered: item.total_ordered,
        total_received: item.total_received,
        remaining: item.remaining,
        unit: item.unit || '',
        percent_received: `${percentReceived.toFixed(0)}%`,
        status: statusLabels[item.material_status] || 'Unknown',
        work_item_name: item.work_item_name,
        work_date: item.work_date ? new Date(item.work_date).toISOString().split('T')[0] : ''
      });

      // Highlight rows with low stock
      if (item.remaining > 0 && percentReceived < 50) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' }
        };
      }
    });

    // Add summary
    sheet.addRow([]);
    const summaryRow = sheet.addRow(['SUMMARY', '', '', '', '', '', '', '', '', '']);
    summaryRow.font = { bold: true };

    const totalOrdered = inventory.reduce((sum, i) => sum + parseFloat(i.total_ordered), 0);
    const totalReceived = inventory.reduce((sum, i) => sum + parseFloat(i.total_received), 0);

    sheet.addRow(['Total Materials', inventory.length]);
    sheet.addRow(['Total Ordered', totalOrdered.toFixed(2)]);
    sheet.addRow(['Total Received', totalReceived.toFixed(2)]);
    sheet.addRow(['Overall % Received', `${((totalReceived / totalOrdered) * 100).toFixed(1)}%`]);

    const filename = `inventory-status-${projectId}-${Date.now()}.xlsx`;
    const filepath = path.join(downloadsDir, filename);
    await workbook.xlsx.writeFile(filepath);

    res.json({
      success: true,
      filename,
      download_url: `/downloads/${filename}`
    });

  } catch (error) {
    console.error('Export inventory Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ==================== ADD THIS ENDPOINT TO YOUR app.js ====================
// Place this with your other Material Management APIs (around line 500-600)

// GET MATERIALS FOR DELIVERY DROPDOWN
// This endpoint returns all materials in a project that can have arrival logs
app.get('/api/project/:projectId/materials-for-delivery', async (req, res) => {
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
        wi.name as work_item_name,
        wi.work_date
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY wi.work_date DESC, mu.material_name
    `, [projectId]);

    // Format for dropdown (id + label)
    const formattedMaterials = materials.map(m => ({
      id: m.id,
      label: `${m.material_name} (${m.qty} ${m.unit || 'units'}) - ${m.work_item_name}`,
      material_name: m.material_name,
      vendor: m.vendor,
      qty: m.qty,
      unit: m.unit,
      work_date: m.work_date
    }));

    res.json({
      success: true,
      materials: formattedMaterials
    });

  } catch (error) {
    console.error('Get materials for delivery error:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤: ' + error.message
    });
  }
});
// 啟動伺服器
app.listen(PORT, () => {
  console.log(`[Express] Server running on port ${PORT}`);
  console.log(`Access: http://localhost:${PORT}`);
});

// ==================== SUPPLIER LOGIN & MANAGEMENT SYSTEM ====================
// Add these endpoints to your existing app.js file

// ============ SUPPLIER AUTHENTICATION ============

// 1. SUPPLIER SIGNUP
app.post('/api/supplier/signup', async (req, res) => {
  const { company_name, email, password, contact_person, phone } = req.body;
  const dbPool = app.locals.dbPool;

  if (!company_name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Company name, email, and password are required.' 
    });
  }

  try {
    // Check if company exists
    const [companies] = await dbPool.query(
      'SELECT company_id FROM Company WHERE LOWER(name) = LOWER(?)',
      [company_name]
    );

    if (companies.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Company not found. Please contact admin to register your company.' 
      });
    }

    const company_id = companies[0].company_id;

    // Check if supplier user already exists
    const [existing] = await dbPool.query(
      'SELECT id FROM supplier_users WHERE company_id = ? OR email = ?',
      [company_id, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Supplier account already exists for this company or email.' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create supplier user
    const [result] = await dbPool.query(`
      INSERT INTO supplier_users 
      (company_id, email, password_hash, contact_person_name, contact_phone)
      VALUES (?, ?, ?, ?, ?)
    `, [company_id, email, passwordHash, contact_person, phone]);

    res.json({ 
      success: true, 
      message: 'Supplier account created successfully.',
      supplier_id: result.insertId
    });

  } catch (error) {
    console.error('Supplier signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup.' 
    });
  }
});

// 2. SUPPLIER LOGIN
app.post('/api/supplier/login', async (req, res) => {
  const { email, password } = req.body;
  const dbPool = app.locals.dbPool;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required.' 
    });
  }

  try {
    // Get supplier user with company info
    const [users] = await dbPool.query(`
      SELECT 
        su.id,
        su.company_id,
        su.email,
        su.password_hash,
        su.contact_person_name,
        su.is_active,
        c.name as company_name
      FROM supplier_users su
      JOIN Company c ON su.company_id = c.company_id
      WHERE su.email = ? AND su.is_active = TRUE
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    const user = users[0];

    // Verify password
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password.' 
      });
    }

    // Update last login
    await dbPool.query(
      'UPDATE supplier_users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Return user info (excluding password hash)
    res.json({
      success: true,
      message: 'Login successful.',
      supplier: {
        id: user.id,
        company_id: user.company_id,
        company_name: user.company_name,
        email: user.email,
        contact_person: user.contact_person_name
      }
    });

  } catch (error) {
    console.error('Supplier login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login.' 
    });
  }
});

// ============ SUPPLIER DASHBOARD ENDPOINTS ============

// 3. GET SUPPLIER DASHBOARD SUMMARY
app.get('/api/supplier/:supplierId/dashboard', async (req, res) => {
  const { supplierId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    // Get supplier company info
    const [supplier] = await dbPool.query(`
      SELECT su.*, c.name as company_name
      FROM supplier_users su
      JOIN Company c ON su.company_id = c.company_id
      WHERE su.id = ?
    `, [supplierId]);

    if (supplier.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found.' 
      });
    }

    const companyName = supplier[0].company_name;

    // Get order statistics
    const [stats] = await dbPool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN material_status = 2 THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN material_status = 1 THEN 1 ELSE 0 END) as in_transit_orders,
        SUM(CASE WHEN material_status = 0 THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN material_status = 3 THEN 1 ELSE 0 END) as delayed_orders,
        SUM(qty * COALESCE(unit_price, 0)) as total_value,
        COUNT(DISTINCT wi.project_id) as active_projects
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE LOWER(TRIM(mu.vendor)) = LOWER(TRIM(?))
    `, [companyName]);

    // Get urgent orders (required within 7 days)
    const [urgentOrders] = await dbPool.query(`
      SELECT 
        mu.id,
        mu.material_name,
        mu.qty,
        mu.unit,
        wi.work_date,
        p.project_name,
        DATEDIFF(wi.work_date, CURDATE()) as days_until
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      JOIN projects p ON wi.project_id = p.id
      WHERE LOWER(TRIM(mu.vendor)) = LOWER(TRIM(?))
        AND mu.material_status IN (2, 3)
        AND wi.work_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY wi.work_date ASC
      LIMIT 10
    `, [companyName]);

    // Get unread notifications count
    const [notifications] = await dbPool.query(`
      SELECT COUNT(*) as unread_count
      FROM supplier_notifications
      WHERE supplier_company_id = ? AND is_read = FALSE
    `, [supplier[0].company_id]);

    res.json({
      success: true,
      dashboard: {
        supplier_info: supplier[0],
        statistics: stats[0],
        urgent_orders: urgentOrders,
        unread_notifications: notifications[0].unread_count
      }
    });

  } catch (error) {
    console.error('Get supplier dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// 4. GET ALL ORDERS FOR SUPPLIER
app.get('/api/supplier/:supplierId/orders', async (req, res) => {
  const { supplierId } = req.params;
  const { status, project_id, date_from, date_to } = req.query;
  const dbPool = app.locals.dbPool;

  try {
    // Get supplier company name
    const [supplier] = await dbPool.query(`
      SELECT c.name as company_name
      FROM supplier_users su
      JOIN Company c ON su.company_id = c.company_id
      WHERE su.id = ?
    `, [supplierId]);

    if (supplier.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found.' 
      });
    }

    const companyName = supplier[0].company_name;

    // Build query with filters
    let query = `
      SELECT 
        mu.id,
        mu.material_name,
        mu.qty,
        mu.unit,
        mu.unit_price,
        (mu.qty * COALESCE(mu.unit_price, 0)) as total_value,
        mu.material_status,
        wi.name as work_item_name,
        wi.work_date as required_date,
        p.id as project_id,
        p.project_name,
        p.owner as project_owner,
        al.expected_date,
        al.actual_date,
        al.delivery_status,
        CASE mu.material_status
          WHEN 0 THEN 'Delivered'
          WHEN 1 THEN 'In Transit'
          WHEN 2 THEN 'Pending Order'
          WHEN 3 THEN 'Delayed'
        END as status_label
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      JOIN projects p ON wi.project_id = p.id
      LEFT JOIN material_arrival_logs al ON mu.id = al.material_id
      WHERE LOWER(TRIM(mu.vendor)) = LOWER(TRIM(?))
    `;

    const params = [companyName];

    // Add filters
    if (status !== undefined) {
      query += ' AND mu.material_status = ?';
      params.push(status);
    }

    if (project_id) {
      query += ' AND p.id = ?';
      params.push(project_id);
    }

    if (date_from) {
      query += ' AND wi.work_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND wi.work_date <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY wi.work_date ASC, mu.id DESC';

    const [orders] = await dbPool.query(query, params);

    res.json({
      success: true,
      orders: orders,
      total_count: orders.length
    });

  } catch (error) {
    console.error('Get supplier orders error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// 5. UPDATE ORDER STATUS (Supplier confirms shipment)
app.put('/api/supplier/orders/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status, notes, expected_delivery_date, supplier_id } = req.body;
  const dbPool = app.locals.dbPool;

  try {
    // Verify supplier owns this order
    const [order] = await dbPool.query(`
      SELECT mu.*, c.company_id
      FROM materials_used mu
      LEFT JOIN Company c ON LOWER(TRIM(c.name)) = LOWER(TRIM(mu.vendor))
      JOIN supplier_users su ON c.company_id = su.company_id
      WHERE mu.id = ? AND su.id = ?
    `, [orderId, supplier_id]);

    if (order.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Order not found or access denied.' 
      });
    }

    // Log status change
    await dbPool.query(`
      INSERT INTO supplier_order_status_log 
      (material_id, old_status, new_status, notes, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `, [orderId, order[0].material_status, status, notes, `Supplier-${supplier_id}`]);

    // Update material status
    await dbPool.query(
      'UPDATE materials_used SET material_status = ? WHERE id = ?',
      [status, orderId]
    );

    // Update or create arrival log
    if (expected_delivery_date) {
      const [existingLog] = await dbPool.query(
        'SELECT id FROM material_arrival_logs WHERE material_id = ? ORDER BY created_at DESC LIMIT 1',
        [orderId]
      );

      if (existingLog.length > 0) {
        await dbPool.query(`
          UPDATE material_arrival_logs 
          SET expected_date = ?, delivery_status = ?, notes = ?
          WHERE id = ?
        `, [expected_delivery_date, 
            status === 1 ? 'in_transit' : status === 0 ? 'delivered' : 'pending',
            notes, existingLog[0].id]);
      } else {
        await dbPool.query(`
          INSERT INTO material_arrival_logs 
          (material_id, expected_date, delivery_status, notes)
          VALUES (?, ?, ?, ?)
        `, [orderId, expected_delivery_date, 
            status === 1 ? 'in_transit' : 'pending', notes]);
      }
    }

    res.json({ 
      success: true, 
      message: 'Order status updated successfully.' 
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// 6. GET SUPPLIER NOTIFICATIONS
app.get('/api/supplier/:supplierId/notifications', async (req, res) => {
  const { supplierId } = req.params;
  const { unread_only } = req.query;
  const dbPool = app.locals.dbPool;

  try {
    const [supplier] = await dbPool.query(
      'SELECT company_id FROM supplier_users WHERE id = ?',
      [supplierId]
    );

    if (supplier.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found.' 
      });
    }

    let query = `
      SELECT * FROM supplier_notifications
      WHERE supplier_company_id = ?
    `;

    if (unread_only === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [notifications] = await dbPool.query(query, [supplier[0].company_id]);

    res.json({ 
      success: true, 
      notifications: notifications 
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// 7. MARK NOTIFICATION AS READ
app.put('/api/supplier/notifications/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    await dbPool.query(
      'UPDATE supplier_notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );

    res.json({ 
      success: true, 
      message: 'Notification marked as read.' 
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// 8. GET SUPPLIER PERFORMANCE METRICS
app.get('/api/supplier/:supplierId/performance', async (req, res) => {
  const { supplierId } = req.params;
  const dbPool = app.locals.dbPool;

  try {
    const [supplier] = await dbPool.query(`
      SELECT c.name as company_name, c.company_id
      FROM supplier_users su
      JOIN Company c ON su.company_id = c.company_id
      WHERE su.id = ?
    `, [supplierId]);

    if (supplier.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Supplier not found.' 
      });
    }

    const companyName = supplier[0].company_name;

    // On-time delivery rate
    const [deliveryMetrics] = await dbPool.query(`
      SELECT 
        COUNT(*) as total_deliveries,
        SUM(CASE 
          WHEN al.delivery_status = 'delivered' AND al.actual_date <= al.expected_date 
          THEN 1 ELSE 0 
        END) as on_time_deliveries
      FROM materials_used mu
      JOIN material_arrival_logs al ON mu.id = al.material_id
      WHERE LOWER(TRIM(mu.vendor)) = LOWER(TRIM(?))
        AND al.delivery_status = 'delivered'
    `, [companyName]);

    // Average quality score
    const [qualityMetrics] = await dbPool.query(`
      SELECT 
        AVG(qs.score) as avg_quality_score,
        COUNT(*) as total_inspections
      FROM material_quality_scores qs
      JOIN materials_used mu ON qs.material_id = mu.id
      WHERE LOWER(TRIM(mu.vendor)) = LOWER(TRIM(?))
    `, [companyName]);

    // Ratings
    const [ratings] = await dbPool.query(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as total_ratings
      FROM vendor_ratings
      WHERE LOWER(TRIM(vendor_name)) = LOWER(TRIM(?))
    `, [companyName]);

    // Defect count
    const [defects] = await dbPool.query(`
      SELECT COUNT(*) as defect_count
      FROM material_defect_reports dr
      JOIN materials_used mu ON dr.material_id = mu.id
      WHERE LOWER(TRIM(mu.vendor)) = LOWER(TRIM(?))
        AND dr.status IN ('open', 'investigating')
    `, [companyName]);

    const onTimeRate = deliveryMetrics[0].total_deliveries > 0
      ? (deliveryMetrics[0].on_time_deliveries / deliveryMetrics[0].total_deliveries * 100)
      : 0;

    res.json({
      success: true,
      performance: {
        delivery: {
          total: deliveryMetrics[0].total_deliveries,
          on_time: deliveryMetrics[0].on_time_deliveries,
          on_time_rate: onTimeRate.toFixed(1)
        },
        quality: {
          avg_score: qualityMetrics[0].avg_quality_score 
            ? parseFloat(qualityMetrics[0].avg_quality_score).toFixed(1) 
            : 'N/A',
          total_inspections: qualityMetrics[0].total_inspections
        },
        ratings: {
          avg_rating: ratings[0].avg_rating 
            ? parseFloat(ratings[0].avg_rating).toFixed(1) 
            : 'N/A',
          total_ratings: ratings[0].total_ratings
        },
        defects: defects[0].defect_count
      }
    });

  } catch (error) {
    console.error('Get supplier performance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
});

// ==================== SUPPLIER ACCOUNT INITIALIZATION SCRIPT ====================
// Add this to your app.js or run it as a separate initialization script

/**
 * Initialize supplier accounts for all companies in the database
 * Default password: "123"
 */
async function initializeSupplierAccounts() {
  const dbPool = app.locals.dbPool;
  
  try {
    console.log('[Supplier Setup] Starting supplier account initialization...');

    // Get all companies
    const [companies] = await dbPool.query(`
      SELECT 
        c.company_id,
        c.name,
        ci.email,
        ci.phone
      FROM Company c
      JOIN ContactInfo ci ON c.FK_contact_id = ci.contact_id
      WHERE c.name IS NOT NULL AND c.name != ''
      ORDER BY c.name
    `);

    console.log(`[Supplier Setup] Found ${companies.length} companies`);

    // Hash the default password "123"
    const defaultPassword = '123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    let successCount = 0;
    let skipCount = 0;

    for (const company of companies) {
      try {
        // Check if supplier user already exists
        const [existing] = await dbPool.query(
          'SELECT id FROM supplier_users WHERE company_id = ?',
          [company.company_id]
        );

        if (existing.length > 0) {
          console.log(`[Supplier Setup] Skipping ${company.name} - account already exists`);
          skipCount++;
          continue;
        }

        // Generate email from company name
        const email = company.email || 
          `${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.com`;

        // Create supplier account
        await dbPool.query(`
          INSERT INTO supplier_users 
          (company_id, email, password_hash, contact_person_name, contact_phone)
          VALUES (?, ?, ?, ?, ?)
        `, [
          company.company_id,
          email,
          passwordHash,
          company.name,
          company.phone
        ]);

        console.log(`[Supplier Setup] ✓ Created account for: ${company.name}`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${defaultPassword}`);
        successCount++;

      } catch (error) {
        console.error(`[Supplier Setup] Failed to create account for ${company.name}:`, error.message);
      }
    }

    console.log('\n[Supplier Setup] Initialization complete!');
    console.log(`   Created: ${successCount} accounts`);
    console.log(`   Skipped: ${skipCount} accounts (already exist)`);
    console.log(`   Total: ${companies.length} companies\n`);

    // Show login credentials
    console.log('[Supplier Setup] Login Credentials Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const [supplierAccounts] = await dbPool.query(`
      SELECT 
        su.id,
        su.email,
        c.name as company_name
      FROM supplier_users su
      JOIN Company c ON su.company_id = c.company_id
      ORDER BY c.name
      LIMIT 20
    `);

    supplierAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.company_name}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Password: 123`);
      console.log('   ─────────────────────────────────────');
    });

    if (supplierAccounts.length < companies.length) {
      console.log(`   ... and ${companies.length - supplierAccounts.length} more accounts`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('[Supplier Setup] Initialization failed:', error);
  }
}

/**
 * Update a specific supplier's password
 */
async function updateSupplierPassword(email, newPassword) {
  const dbPool = app.locals.dbPool;

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [result] = await dbPool.query(
      'UPDATE supplier_users SET password_hash = ? WHERE email = ?',
      [passwordHash, email]
    );

    if (result.affectedRows > 0) {
      console.log(`[Supplier Setup] Password updated for ${email}`);
      return true;
    } else {
      console.log(`[Supplier Setup] Supplier not found: ${email}`);
      return false;
    }
  } catch (error) {
    console.error(`[Supplier Setup] Failed to update password:`, error);
    return false;
  }
}

/**
 * Get all supplier login credentials (for testing)
 */
async function getAllSupplierCredentials() {
  const dbPool = app.locals.dbPool;

  try {
    const [suppliers] = await dbPool.query(`
      SELECT 
        su.id,
        su.email,
        c.name as company_name,
        c.company_id,
        su.created_at
      FROM supplier_users su
      JOIN Company c ON su.company_id = c.company_id
      ORDER BY c.name
    `);

    console.log('\n[Supplier Credentials] All Supplier Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    suppliers.forEach((supplier, index) => {
      console.log(`${index + 1}. ${supplier.company_name} (ID: ${supplier.company_id})`);
      console.log(`   Email: ${supplier.email}`);
      console.log(`   Password: 123 (default)`);
      console.log(`   Created: ${supplier.created_at}`);
      console.log('   ─────────────────────────────────────');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return suppliers;
  } catch (error) {
    console.error('[Supplier Credentials] Failed to fetch:', error);
    return [];
  }
}

// ==================== API ENDPOINT FOR MANUAL INITIALIZATION ====================

// Add this endpoint to manually trigger initialization via API
app.post('/api/admin/initialize-suppliers', async (req, res) => {
  const { admin_key } = req.body;

  // Simple security check (replace with proper authentication)
  if (admin_key !== '417') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  try {
    await initializeSupplierAccounts();
    const credentials = await getAllSupplierCredentials();

    res.json({
      success: true,
      message: 'Supplier accounts initialized successfully',
      total_accounts: credentials.length,
      accounts: credentials.map(c => ({
        company_name: c.company_name,
        email: c.email,
        default_password: '123'
      }))
    });

  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== AUTO-RUN ON SERVER START ====================

// Automatically initialize supplier accounts when server starts
// Add this after your database initialization in app.js

setTimeout(async () => {
  if (app.locals.dbPool) {
    console.log('\n[Server] Checking supplier accounts...\n');
    
    // Check if any supplier accounts exist
    const [existing] = await app.locals.dbPool.query(
      'SELECT COUNT(*) as count FROM supplier_users'
    );

    if (existing[0].count === 0) {
      console.log('[Server] No supplier accounts found. Initializing...\n');
      await initializeSupplierAccounts();
    } else {
      console.log(`[Server] Found ${existing[0].count} existing supplier accounts.\n`);
      // Uncomment to see all credentials:
      // await getAllSupplierCredentials();
    }
  }
}, 3000); // Wait 3 seconds after server start

// Export functions for manual use
module.exports = {
  initializeSupplierAccounts,
  updateSupplierPassword,
  getAllSupplierCredentials
};