// server.js - Complete Express Server
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = 80;

// Database configuration
const dbConfig = {
  host: 'assignment-mysql',
  user: 'Procura',
  password: '417',
  database: 'assignment_db'
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Database connection pool
const pool = mysql.createPool(dbConfig);

// ==================== API Routes ====================

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// User Authentication - Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('=== LOGIN REQUEST ===');
  console.log('Email:', email);
  console.log('Password:', password ? '***' : 'missing');
  
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ success: false, message: '找不到該使用者' });
    }
    
    const user = rows[0];
    
    // Simple password check (comparing plaintext)
    if (password === user.password_hash) {
      console.log('✅ Login successful:', email);
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          company_name: user.company_name,
          subscription_plan: user.subscription_plan
        }
      });
    } else {
      console.log('❌ Invalid password for:', email);
      res.status(401).json({ success: false, message: '密碼錯誤' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// User Registration - Signup
app.post('/api/signup', async (req, res) => {
  // Log the ENTIRE request body to see what we're receiving
  console.log('=== SIGNUP REQUEST ===');
  console.log('Full request body:', JSON.stringify(req.body, null, 2));
  console.log('Body keys:', Object.keys(req.body));
  
  const { company_name, email, phone, password, subscription_plan } = req.body;
  
  console.log('Extracted values:', { 
    company_name, 
    email, 
    phone, 
    password: password ? '***' : 'MISSING',
    subscription_plan 
  });
  console.log('=====================');
  
  // Validation - Check what's actually missing
  if (!email) {
    console.log('❌ Email is missing');
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required.' 
    });
  }
  
  if (!password) {
    console.log('❌ Password is missing');
    return res.status(400).json({ 
      success: false, 
      message: 'Password is required.' 
    });
  }
  
  if (!company_name) {
    console.log('❌ Company name is missing');
    return res.status(400).json({ 
      success: false, 
      message: 'Company name is required.' 
    });
  }
  
  if (!phone) {
    console.log('❌ Phone is missing');
    return res.status(400).json({ 
      success: false, 
      message: 'Phone number is required.' 
    });
  }
  
  try {
    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Email 已被註冊' 
      });
    }
    
    // Insert new user
    console.log('✅ Inserting new user:', { company_name, email, phone, subscription_plan });
    const [result] = await pool.query(
      'INSERT INTO users (company_name, email, phone, password_hash, subscription_plan) VALUES (?, ?, ?, ?, ?)',
      [company_name, email, phone, password, subscription_plan || 'trial']
    );
    
    console.log('✅ Signup successful! User ID:', result.insertId);
    
    res.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.insertId,
        email,
        company_name,
        subscription_plan: subscription_plan || 'trial'
      }
    });
  } catch (error) {
    console.error('❌ Signup database error:', error);
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤: ' + error.message 
    });
  }
});

// Get all projects for a user
app.get('/api/projects/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Search projects
app.get('/api/projects/search/:userId', async (req, res) => {
  const { userId } = req.params;
  const { query } = req.query;
  
  console.log('Search request:', { userId, query });
  
  try {
    let sql = 'SELECT * FROM projects WHERE user_id = ?';
    const params = [userId];
    
    if (query) {
      sql += ' AND (project_name LIKE ? OR tags LIKE ? OR owner LIKE ?)';
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const [projects] = await pool.query(sql, params);
    
    console.log(`Found ${projects.length} projects`);
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Search projects error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get project details with work items and materials
app.get('/api/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  
  console.log('Get project details:', projectId);
  
  try {
    // Get project info
    const [project] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ success: false, message: '找不到專案' });
    }
    
    // Get work items
    const [workItems] = await pool.query(
      'SELECT * FROM work_items WHERE project_id = ? ORDER BY work_date, start_time',
      [projectId]
    );
    
    // Get materials for each work item
    for (let item of workItems) {
      const [materials] = await pool.query(
        'SELECT * FROM materials_used WHERE work_item_id = ?',
        [item.id]
      );
      item.materials = materials;
    }
    
    res.json({
      success: true,
      project: project[0],
      workItems
    });
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get materials list for a project
app.get('/api/project/:projectId/materials', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [materials] = await pool.query(`
      SELECT 
        mu.*,
        wi.name as work_item_name,
        wi.work_date
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      ORDER BY wi.work_date, mu.material_name
    `, [projectId]);
    
    res.json({ success: true, materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Create new project
app.post('/api/projects', async (req, res) => {
  const { user_id, project_name, tags, owner } = req.body;
  
  try {
    const [result] = await pool.query(
      'INSERT INTO projects (user_id, project_name, tags, owner) VALUES (?, ?, ?, ?)',
      [user_id, project_name, tags, owner]
    );
    
    res.json({
      success: true,
      project: {
        id: result.insertId,
        user_id,
        project_name,
        tags,
        owner
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Update material status
app.put('/api/materials/:materialId', async (req, res) => {
  const { materialId } = req.params;
  const { material_status } = req.body;
  
  try {
    await pool.query(
      'UPDATE materials_used SET material_status = ? WHERE id = ?',
      [material_status, materialId]
    );
    
    res.json({ success: true, message: '材料狀態已更新' });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Update work item status
app.put('/api/workitems/:workItemId', async (req, res) => {
  const { workItemId } = req.params;
  const { status } = req.body;
  
  try {
    await pool.query(
      'UPDATE work_items SET status = ? WHERE id = ?',
      [status, workItemId]
    );
    
    res.json({ success: true, message: '工項狀態已更新' });
  } catch (error) {
    console.error('Update work item error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get all companies (for vendor management)
app.get('/api/companies', async (req, res) => {
  try {
    const [companies] = await pool.query(
      'SELECT * FROM Company ORDER BY name LIMIT 100'
    );
    
    res.json({ success: true, companies });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get all materials from Material table
app.get('/api/materials', async (req, res) => {
  try {
    const [materials] = await pool.query(
      'SELECT * FROM Material ORDER BY Item_Description LIMIT 100'
    );
    
    res.json({ success: true, materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// ==================== Start Server ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ✅ Procura Server Running            ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║   🌐 URL: http://localhost:8080       ║`);
  console.log(`║   📊 Database: ${dbConfig.database.padEnd(24)} ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});

// ==================== Material Management APIs (Steven's Features) ====================
// Add these endpoints to your server.js file after the existing routes

// 1. ARRIVAL LOG & DELIVERY SCHEDULE
// Get all arrival logs for a project's materials
app.get('/api/project/:projectId/arrival-logs', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [logs] = await pool.query(`
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
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Add or update arrival log
app.post('/api/materials/:materialId/arrival-log', async (req, res) => {
  const { materialId } = req.params;
  const { expected_date, actual_date, delivery_status, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_arrival_logs 
      (material_id, expected_date, actual_date, delivery_status, notes) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, expected_date, actual_date, delivery_status || 'pending', notes]);
    
    res.json({ success: true, logId: result.insertId });
  } catch (error) {
    console.error('Add arrival log error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get delayed shipments for a project
app.get('/api/project/:projectId/delayed-shipments', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [delayed] = await pool.query(`
      SELECT 
        al.*,
        mu.material_name,
        mu.vendor,
        wi.name as work_item_name,
        DATEDIFF(CURDATE(), al.expected_date) as days_delayed
      FROM material_arrival_logs al
      JOIN materials_used mu ON al.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ? 
        AND al.delivery_status != 'delivered'
        AND al.expected_date < CURDATE()
      ORDER BY days_delayed DESC
    `, [projectId]);
    
    res.json({ success: true, delayed });
  } catch (error) {
    console.error('Get delayed shipments error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 2. QUALITY SCORE & INSPECTION
// Add quality score for a material
app.post('/api/materials/:materialId/quality-score', async (req, res) => {
  const { materialId } = req.params;
  const { score, inspector_name, inspection_date, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_quality_scores 
      (material_id, score, inspector_name, inspection_date, notes) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, score, inspector_name, inspection_date, notes]);
    
    res.json({ success: true, scoreId: result.insertId });
  } catch (error) {
    console.error('Add quality score error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get quality history for a material
app.get('/api/materials/:materialId/quality-history', async (req, res) => {
  const { materialId } = req.params;
  
  try {
    const [history] = await pool.query(`
      SELECT * FROM material_quality_scores 
      WHERE material_id = ? 
      ORDER BY inspection_date DESC
    `, [materialId]);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get quality history error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get inspection checklist template
app.get('/api/inspection-checklist', async (req, res) => {
  try {
    const [checklist] = await pool.query(`
      SELECT * FROM inspection_checklist_items ORDER BY category, item_order
    `);
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Submit inspection checklist result
app.post('/api/materials/:materialId/inspection', async (req, res) => {
  const { materialId } = req.params;
  const { inspector_name, inspection_date, checklist_results, overall_pass } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_inspections 
      (material_id, inspector_name, inspection_date, checklist_results, overall_pass) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, inspector_name, inspection_date, JSON.stringify(checklist_results), overall_pass]);
    
    res.json({ success: true, inspectionId: result.insertId });
  } catch (error) {
    console.error('Add inspection error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 3. DEFECT REPORT SYSTEM
// Submit defect report
app.post('/api/materials/:materialId/defect-report', async (req, res) => {
  const { materialId } = req.params;
  const { defect_type, severity, description, reported_by, report_date } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_defect_reports 
      (material_id, defect_type, severity, description, reported_by, report_date, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `, [materialId, defect_type, severity, description, reported_by, report_date]);
    
    res.json({ success: true, reportId: result.insertId });
  } catch (error) {
    console.error('Add defect report error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get all defect reports for a project
app.get('/api/project/:projectId/defect-reports', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [reports] = await pool.query(`
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
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 4. MATERIAL TESTING RESULTS
// Add test result
app.post('/api/materials/:materialId/test-results', async (req, res) => {
  const { materialId } = req.params;
  const { test_type, test_date, result_value, pass_fail, tester_name, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_test_results 
      (material_id, test_type, test_date, result_value, pass_fail, tester_name, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [materialId, test_type, test_date, result_value, pass_fail, tester_name, notes]);
    
    res.json({ success: true, testId: result.insertId });
  } catch (error) {
    console.error('Add test result error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get test results for a material
app.get('/api/materials/:materialId/test-results', async (req, res) => {
  const { materialId } = req.params;
  
  try {
    const [results] = await pool.query(`
      SELECT * FROM material_test_results 
      WHERE material_id = ? 
      ORDER BY test_date DESC
    `, [materialId]);
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 5. INVENTORY TRACKING
// Get inventory levels for a project
app.get('/api/project/:projectId/inventory', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [inventory] = await pool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.quantity) as total_ordered,
        COALESCE(SUM(mi.quantity_received), 0) as total_received,
        (SUM(mu.quantity) - COALESCE(SUM(mi.quantity_received), 0)) as remaining,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
    `, [projectId]);
    
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Update inventory (when materials arrive)
app.post('/api/materials/:materialId/inventory-update', async (req, res) => {
  const { materialId } = req.params;
  const { quantity_received, received_date, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_inventory 
      (material_id, quantity_received, received_date, notes) 
      VALUES (?, ?, ?, ?)
    `, [materialId, quantity_received, received_date, notes]);
    
    res.json({ success: true, inventoryId: result.insertId });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get reorder alerts (low stock items)
app.get('/api/project/:projectId/reorder-alerts', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [alerts] = await pool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.quantity) as total_needed,
        COALESCE(SUM(mi.quantity_received), 0) as total_received,
        (SUM(mu.quantity) - COALESCE(SUM(mi.quantity_received), 0)) as shortage,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
      HAVING shortage > 0
      ORDER BY shortage DESC
    `, [projectId]);
    
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Get reorder alerts error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 6. COST ANALYSIS
// Get cost analysis for a project
app.get('/api/project/:projectId/cost-analysis', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [costs] = await pool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.quantity) as total_quantity,
        mu.unit,
        AVG(mu.unit_price) as avg_price,
        SUM(mu.quantity * mu.unit_price) as total_cost
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
      ORDER BY total_cost DESC
    `, [projectId]);
    
    res.json({ success: true, costs });
  } catch (error) {
    console.error('Get cost analysis error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// ==================== Material Management APIs (Steven's Features) ====================
// Add these endpoints to your server.js file after the existing routes

// 1. ARRIVAL LOG & DELIVERY SCHEDULE
// Get all arrival logs for a project's materials
app.get('/api/project/:projectId/arrival-logs', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [logs] = await pool.query(`
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
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Add or update arrival log
app.post('/api/materials/:materialId/arrival-log', async (req, res) => {
  const { materialId } = req.params;
  const { expected_date, actual_date, delivery_status, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_arrival_logs 
      (material_id, expected_date, actual_date, delivery_status, notes) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, expected_date, actual_date, delivery_status || 'pending', notes]);
    
    res.json({ success: true, logId: result.insertId });
  } catch (error) {
    console.error('Add arrival log error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get delayed shipments for a project
app.get('/api/project/:projectId/delayed-shipments', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [delayed] = await pool.query(`
      SELECT 
        al.*,
        mu.material_name,
        mu.vendor,
        wi.name as work_item_name,
        DATEDIFF(CURDATE(), al.expected_date) as days_delayed
      FROM material_arrival_logs al
      JOIN materials_used mu ON al.material_id = mu.id
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ? 
        AND al.delivery_status != 'delivered'
        AND al.expected_date < CURDATE()
      ORDER BY days_delayed DESC
    `, [projectId]);
    
    res.json({ success: true, delayed });
  } catch (error) {
    console.error('Get delayed shipments error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 2. QUALITY SCORE & INSPECTION
// Add quality score for a material
app.post('/api/materials/:materialId/quality-score', async (req, res) => {
  const { materialId } = req.params;
  const { score, inspector_name, inspection_date, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_quality_scores 
      (material_id, score, inspector_name, inspection_date, notes) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, score, inspector_name, inspection_date, notes]);
    
    res.json({ success: true, scoreId: result.insertId });
  } catch (error) {
    console.error('Add quality score error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get quality history for a material
app.get('/api/materials/:materialId/quality-history', async (req, res) => {
  const { materialId } = req.params;
  
  try {
    const [history] = await pool.query(`
      SELECT * FROM material_quality_scores 
      WHERE material_id = ? 
      ORDER BY inspection_date DESC
    `, [materialId]);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get quality history error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get inspection checklist template
app.get('/api/inspection-checklist', async (req, res) => {
  try {
    const [checklist] = await pool.query(`
      SELECT * FROM inspection_checklist_items ORDER BY category, item_order
    `);
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Submit inspection checklist result
app.post('/api/materials/:materialId/inspection', async (req, res) => {
  const { materialId } = req.params;
  const { inspector_name, inspection_date, checklist_results, overall_pass } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_inspections 
      (material_id, inspector_name, inspection_date, checklist_results, overall_pass) 
      VALUES (?, ?, ?, ?, ?)
    `, [materialId, inspector_name, inspection_date, JSON.stringify(checklist_results), overall_pass]);
    
    res.json({ success: true, inspectionId: result.insertId });
  } catch (error) {
    console.error('Add inspection error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 3. DEFECT REPORT SYSTEM
// Submit defect report
app.post('/api/materials/:materialId/defect-report', async (req, res) => {
  const { materialId } = req.params;
  const { defect_type, severity, description, reported_by, report_date } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_defect_reports 
      (material_id, defect_type, severity, description, reported_by, report_date, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `, [materialId, defect_type, severity, description, reported_by, report_date]);
    
    res.json({ success: true, reportId: result.insertId });
  } catch (error) {
    console.error('Add defect report error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get all defect reports for a project
app.get('/api/project/:projectId/defect-reports', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [reports] = await pool.query(`
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
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 4. MATERIAL TESTING RESULTS
// Add test result
app.post('/api/materials/:materialId/test-results', async (req, res) => {
  const { materialId } = req.params;
  const { test_type, test_date, result_value, pass_fail, tester_name, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_test_results 
      (material_id, test_type, test_date, result_value, pass_fail, tester_name, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [materialId, test_type, test_date, result_value, pass_fail, tester_name, notes]);
    
    res.json({ success: true, testId: result.insertId });
  } catch (error) {
    console.error('Add test result error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get test results for a material
app.get('/api/materials/:materialId/test-results', async (req, res) => {
  const { materialId } = req.params;
  
  try {
    const [results] = await pool.query(`
      SELECT * FROM material_test_results 
      WHERE material_id = ? 
      ORDER BY test_date DESC
    `, [materialId]);
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 5. INVENTORY TRACKING
// Get inventory levels for a project
app.get('/api/project/:projectId/inventory', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [inventory] = await pool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.quantity) as total_ordered,
        COALESCE(SUM(mi.quantity_received), 0) as total_received,
        (SUM(mu.quantity) - COALESCE(SUM(mi.quantity_received), 0)) as remaining,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
    `, [projectId]);
    
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Update inventory (when materials arrive)
app.post('/api/materials/:materialId/inventory-update', async (req, res) => {
  const { materialId } = req.params;
  const { quantity_received, received_date, notes } = req.body;
  
  try {
    const [result] = await pool.query(`
      INSERT INTO material_inventory 
      (material_id, quantity_received, received_date, notes) 
      VALUES (?, ?, ?, ?)
    `, [materialId, quantity_received, received_date, notes]);
    
    res.json({ success: true, inventoryId: result.insertId });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// Get reorder alerts (low stock items)
app.get('/api/project/:projectId/reorder-alerts', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [alerts] = await pool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.quantity) as total_needed,
        COALESCE(SUM(mi.quantity_received), 0) as total_received,
        (SUM(mu.quantity) - COALESCE(SUM(mi.quantity_received), 0)) as shortage,
        mu.unit
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      LEFT JOIN material_inventory mi ON mu.id = mi.material_id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
      HAVING shortage > 0
      ORDER BY shortage DESC
    `, [projectId]);
    
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Get reorder alerts error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 6. COST ANALYSIS
// Get cost analysis for a project
app.get('/api/project/:projectId/cost-analysis', async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const [costs] = await pool.query(`
      SELECT 
        mu.material_name,
        mu.vendor,
        SUM(mu.quantity) as total_quantity,
        mu.unit,
        AVG(mu.unit_price) as avg_price,
        SUM(mu.quantity * mu.unit_price) as total_cost
      FROM materials_used mu
      JOIN work_items wi ON mu.work_item_id = wi.id
      WHERE wi.project_id = ?
      GROUP BY mu.material_name, mu.vendor, mu.unit
      ORDER BY total_cost DESC
    `, [projectId]);
    
    res.json({ success: true, costs });
  } catch (error) {
    console.error('Get cost analysis error:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});