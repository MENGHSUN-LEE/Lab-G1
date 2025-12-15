USE assignment_db;

DROP TABLE IF EXISTS Companies, Transactions, Materials;
CREATE TABLE Companies (
    company_id VARCHAR(20),
    name VARCHAR(255),
    description TEXT,
    address VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    comments TEXT
);

LOAD DATA INFILE '/var/lib/mysql-files/companies.tsv'
INTO TABLE Companies
FIELDS TERMINATED BY '\t'   
OPTIONALLY ENCLOSED BY '"'  
LINES TERMINATED BY '\r\n'    
IGNORE 1 ROWS;


CREATE TABLE Transactions (
    transaction_id VARCHAR(20),
    company_id VARCHAR(100),
    material_id VARCHAR(100),
    quantity VARCHAR(100),
    price_per_unit VARCHAR(50),
    discount_rate VARCHAR(100),
    total_price VARCHAR(100),
    transaction_date VARCHAR(50),
    notes TEXT
);


LOAD DATA INFILE '/var/lib/mysql-files/transactions.tsv'
INTO TABLE Transactions
FIELDS TERMINATED BY '\t'
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;


CREATE TABLE Materials (
    material_id VARCHAR(100),
    Item TEXT,
    Unit VARCHAR(100),
    PriceAvg VARCHAR(100),
    PriceStdev VARCHAR(100),
    NoSamples VARCHAR(100)
);


LOAD DATA INFILE '/var/lib/mysql-files/materials.tsv'
INTO TABLE Materials
FIELDS TERMINATED BY '\t'
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;


-- 2. 過濾後的資料表 (Filtered Staging Tables)
DROP TABLE IF EXISTS FilteredTransactions, FilteredMaterials, FilteredCompanies;

CREATE TABLE FilteredTransactions (
    transaction_id VARCHAR(20), company_id VARCHAR(100), material_id VARCHAR(100),
    quantity VARCHAR(100), price_per_unit VARCHAR(50), discount_rate VARCHAR(100),
    total_price VARCHAR(100), transaction_date VARCHAR(50), notes TEXT
);
INSERT INTO FilteredTransactions
SELECT
    T.*
FROM
    Transactions AS T
WHERE
    STR_TO_DATE(T.transaction_date, '%Y-%m-%d') > '2000-01-01'
    AND STR_TO_DATE(T.transaction_date, '%Y-%m-%d') IS NOT NULL;


CREATE TABLE FilteredMaterials (
    material_id VARCHAR(100), Item TEXT, Unit VARCHAR(100),
    PriceAvg VARCHAR(100), PriceStdev VARCHAR(100), NoSamples VARCHAR(100)
);
INSERT INTO FilteredMaterials
SELECT DISTINCT
    M.*
FROM
    Materials AS M
INNER JOIN
    FilteredTransactions AS FT ON M.material_id = FT.material_id;


CREATE TABLE FilteredCompanies (
    company_id VARCHAR(20), name VARCHAR(255), description TEXT,
    address VARCHAR(255), phone VARCHAR(50), email VARCHAR(100), comments TEXT
);
INSERT INTO FilteredCompanies
SELECT DISTINCT
    C.*
FROM
    Companies AS C
INNER JOIN
    FilteredTransactions AS FT ON C.company_id = FT.company_id;


-- 3. 材料分類暫存表 (Material Category Staging Tables)
DROP TABLE IF EXISTS Materials_Quality_management, Materials_Products, Materials_Machine, Materials_Others;

CREATE TABLE Materials_Quality_management AS SELECT * FROM FilteredMaterials WHERE 1=0;
CREATE TABLE Materials_Products AS SELECT * FROM FilteredMaterials WHERE 1=0;
CREATE TABLE Materials_Machine AS SELECT * FROM FilteredMaterials WHERE 1=0;
CREATE TABLE Materials_Others AS SELECT * FROM FilteredMaterials WHERE 1=0;

INSERT INTO Materials_Quality_management SELECT * FROM FilteredMaterials WHERE LOWER(Item) LIKE '%quality management%';
INSERT INTO Materials_Products SELECT * FROM FilteredMaterials WHERE LOWER(Item) LIKE '%product%';
INSERT INTO Materials_Machine SELECT * FROM FilteredMaterials WHERE LOWER(Item) LIKE '%machine%' OR LOWER(Item) LIKE '%technician%';
INSERT INTO Materials_Others
SELECT * FROM FilteredMaterials
WHERE NOT (
    LOWER(Item) LIKE '%quality management%'
    OR LOWER(Item) LIKE '%product%'
    OR LOWER(Item) LIKE '%machine%'
    OR LOWER(Item) LIKE '%technician%'
);


-- 4. 正規化資料表 (Normalized Permanent Tables)
DROP TABLE IF EXISTS Transaction, Material, Company, ContactInfo, Address, MaterialCategory, UnitOfMeasure;

CREATE TABLE UnitOfMeasure (
    unit_id INT AUTO_INCREMENT PRIMARY KEY,
    unit_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE MaterialCategory (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE Address (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    full_address VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE ContactInfo (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100)
);

CREATE TABLE Company (
    company_id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    FK_address_id INT,
    FK_contact_id INT,
    FOREIGN KEY (FK_address_id) REFERENCES Address(address_id),
    FOREIGN KEY (FK_contact_id) REFERENCES ContactInfo(contact_id)
);

CREATE TABLE Material (
    material_id BIGINT PRIMARY KEY,
    Item_Description TEXT,
    PriceAvg DECIMAL(18, 2),
    PriceStdev DECIMAL(18, 2),
    NoSamples INT,
    FK_unit_id INT,
    FK_category_id INT,
    FOREIGN KEY (FK_unit_id) REFERENCES UnitOfMeasure(unit_id),
    FOREIGN KEY (FK_category_id) REFERENCES MaterialCategory(category_id)
);

CREATE TABLE Transaction (
    transaction_id BIGINT PRIMARY KEY,
    quantity DECIMAL(18, 2),
    price_per_unit DECIMAL(18, 2),
    discount_rate DECIMAL(5, 2),
    total_price DECIMAL(18, 2),
    transaction_date DATE,
    notes TEXT,
    FK_company_id BIGINT,
    FK_material_id BIGINT,
    FOREIGN KEY (FK_company_id) REFERENCES Company(company_id),
    FOREIGN KEY (FK_material_id) REFERENCES Material(material_id)
);


-- 5. 插入正規化資料
INSERT IGNORE INTO UnitOfMeasure (unit_name)
SELECT DISTINCT Unit FROM Materials_Quality_management
UNION SELECT DISTINCT Unit FROM Materials_Products
UNION SELECT DISTINCT Unit FROM Materials_Machine
UNION SELECT DISTINCT Unit FROM Materials_Others;

INSERT INTO MaterialCategory (category_name) VALUES
('Quality management'), ('Product'), ('Machine'), ('Technician'), ('Other')
ON DUPLICATE KEY UPDATE category_name = category_name; -- 避免重複

INSERT IGNORE INTO Address (full_address) SELECT DISTINCT address FROM FilteredCompanies;
INSERT IGNORE INTO ContactInfo (phone, email) SELECT DISTINCT phone, email FROM FilteredCompanies;

INSERT INTO Company (company_id, name, description, FK_address_id, FK_contact_id)
SELECT
    CAST(FC.company_id AS UNSIGNED), FC.name, FC.description, A.address_id, CI.contact_id
FROM
    FilteredCompanies AS FC
INNER JOIN Address AS A ON FC.address = A.full_address
INNER JOIN ContactInfo AS CI ON FC.phone = CI.phone AND FC.email = CI.email
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO Material (
    material_id, Item_Description, PriceAvg, PriceStdev, NoSamples, FK_unit_id, FK_category_id
)
SELECT
    CONVERT(FM.material_id, UNSIGNED),
    FM.Item,
    CONVERT(REPLACE(FM.PriceAvg, ',', ''), DECIMAL(18, 2)),
    CONVERT(REPLACE(FM.PriceStdev, ',', ''), DECIMAL(18, 2)),
    CONVERT(FM.NoSamples, SIGNED),
    UOM.unit_id,
    MC.category_id
FROM
    FilteredMaterials AS FM
INNER JOIN UnitOfMeasure AS UOM ON FM.Unit = UOM.unit_name
INNER JOIN MaterialCategory AS MC ON MC.category_name =
    (
        CASE
            WHEN LOWER(FM.Item) LIKE '%quality management%' THEN 'Quality management'
            WHEN LOWER(FM.Item) LIKE '%product%' THEN 'Product'
            WHEN LOWER(FM.Item) LIKE '%technician%' THEN 'Technician'
            WHEN LOWER(FM.Item) LIKE '%machine%' THEN 'Machine'
            ELSE 'Other'
        END
    )
ON DUPLICATE KEY UPDATE material_id = VALUES(material_id);

INSERT INTO Transaction (
    transaction_id, quantity, price_per_unit, discount_rate, total_price,
    transaction_date, notes, FK_company_id, FK_material_id
)
SELECT
    CONVERT(FT.transaction_id, UNSIGNED),
    CONVERT(REPLACE(FT.quantity, ',', ''), DECIMAL(18, 2)),
    CONVERT(REPLACE(FT.price_per_unit, ',', ''), DECIMAL(18, 2)),
    CONVERT(FT.discount_rate, DECIMAL(5, 2)),
    CONVERT(REPLACE(FT.total_price, ',', ''), DECIMAL(18, 2)),
    STR_TO_DATE(FT.transaction_date, '%Y-%m-%d'),
    FT.notes,
    C.company_id,
    M.material_id
FROM
    FilteredTransactions AS FT
INNER JOIN Company AS C ON CONVERT(FT.company_id, UNSIGNED) = C.company_id
INNER JOIN Material AS M ON CONVERT(FT.material_id, UNSIGNED) = M.material_id
WHERE
    STR_TO_DATE(FT.transaction_date, '%Y-%m-%d') IS NOT NULL
ON DUPLICATE KEY UPDATE transaction_id = VALUES(transaction_id);


-- 6. 清理輔助表 (Cleanup Staging Tables)
DROP TABLE IF EXISTS
    Companies, FilteredCompanies, FilteredMaterials, FilteredTransactions,
    Materials, Materials_Machine, Materials_Others, Materials_Products,
    Materials_Quality_management, Transactions;


-- =========================================================
-- II. 應用程式核心資料庫結構 (Construction Management App)
-- =========================================================

-- 1. 核心專案與工項管理 (Core Project & Work Item Management)
DROP TABLE IF EXISTS contractor_favorite_products, rfq_messages, quotation_line_items, supplier_quotations, rfq_invitations, rfq_requests, supplier_products, material_inventory, material_test_results, material_defect_reports, material_inspections, inspection_checklist_items, material_quality_scores, material_arrival_logs, materials_used, work_items, projects, users, vendor_ratings, supplier_notifications, supplier_users, supplier_order_status_log;
DROP VIEW IF EXISTS rfq_summary_view, supplier_product_performance, supplier_orders_view;


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE, -- 電子郵件作為唯一登入帳號
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL, -- 用於儲存加密後的密碼
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'trial', -- 訂閱方案
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- 創建此專案的用戶 ID
    project_name VARCHAR(255) NOT NULL,
    tags VARCHAR(255), -- 以逗號分隔的標籤
    owner VARCHAR(255), -- 專案擁有者/團隊
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE work_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    work_date DATE NOT NULL, -- 該工項的排程日期
    name VARCHAR(255) NOT NULL, -- 工項名稱
    start_time TIME NOT NULL, -- 預計開始時間
    status TINYINT NOT NULL DEFAULT 1, -- 狀態 (0:提前, 1:正常, 2:延後)
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE materials_used (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_item_id INT NOT NULL,
    material_name VARCHAR(255) NOT NULL, -- 建材名稱
    vendor VARCHAR(255), -- 供應商
    qty DECIMAL(10, 2) NOT NULL, -- 數量
    unit VARCHAR(50), -- 單位
    material_status TINYINT NOT NULL DEFAULT 2, -- 叫貨狀態 (0:已到貨, 1:已叫貨, 2:未叫貨, 3:在途)
    unit_price DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Price per unit for cost analysis',
    FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
);


-- 2. 品質管理與物流追蹤 (Quality Management & Logistics)
CREATE TABLE material_arrival_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    expected_date DATE NOT NULL,
    actual_date DATE NULL,
    delivery_status ENUM('pending', 'in_transit', 'delivered', 'delayed') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_expected_date (expected_date),
    INDEX idx_delivery_status (delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE material_quality_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    score DECIMAL(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
    inspector_name VARCHAR(100) NOT NULL,
    inspection_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_material_score (material_id, inspection_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inspection_checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_order INT DEFAULT 0,
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入預設檢查表項目 (如果表為空)
INSERT INTO inspection_checklist_items (category, item_name, item_order, is_critical)
SELECT * FROM (
    SELECT 'Physical Inspection' as category, 'Check for visible damage or defects' as item_name, 1 as item_order, TRUE as is_critical UNION ALL
    SELECT 'Physical Inspection', 'Verify packaging integrity', 2, TRUE UNION ALL
    SELECT 'Physical Inspection', 'Check color consistency', 3, FALSE UNION ALL
    SELECT 'Physical Inspection', 'Inspect surface finish quality', 4, FALSE UNION ALL
    SELECT 'Documentation', 'Verify material certificates', 1, TRUE UNION ALL
    SELECT 'Documentation', 'Check quantity matches order', 2, TRUE UNION ALL
    SELECT 'Documentation', 'Confirm supplier documentation', 3, TRUE UNION ALL
    SELECT 'Measurement', 'Verify dimensions/specifications', 1, TRUE UNION ALL
    SELECT 'Measurement', 'Check weight/volume accuracy', 2, FALSE UNION ALL
    SELECT 'Storage', 'Check storage requirements compliance', 1, FALSE UNION ALL
    SELECT 'Storage', 'Verify expiration dates (if applicable)', 2, TRUE
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM inspection_checklist_items LIMIT 1);

CREATE TABLE material_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    inspector_name VARCHAR(100) NOT NULL,
    inspection_date DATE NOT NULL,
    checklist_results JSON NOT NULL, -- Store checklist item results as JSON
    overall_pass BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_inspection_date (inspection_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE material_defect_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    defect_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    description TEXT NOT NULL,
    reported_by VARCHAR(100) NOT NULL,
    report_date DATE NOT NULL,
    status ENUM('open', 'investigating', 'resolved', 'closed') DEFAULT 'open',
    resolution_notes TEXT,
    resolved_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE material_test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    test_type VARCHAR(100) NOT NULL, -- e.g., 'strength', 'durability', 'chemical composition'
    test_date DATE NOT NULL,
    result_value VARCHAR(200), -- Actual test measurement
    pass_fail ENUM('pass', 'fail', 'conditional') NOT NULL,
    tester_name VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_test_type (test_type),
    INDEX idx_test_date (test_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE material_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    quantity_received DECIMAL(10,2) NOT NULL,
    received_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_received_date (received_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendor_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    project_id INT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. 供應商系統 (Supplier System)
CREATE TABLE supplier_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    contact_person_name VARCHAR(100),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(company_id) ON DELETE CASCADE,
    INDEX idx_email (email),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE supplier_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_company_id BIGINT NOT NULL,
    notification_type ENUM('new_order', 'order_update', 'payment', 'review') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_material_id INT NULL,
    related_project_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_company_id) REFERENCES Company(company_id) ON DELETE CASCADE,
    INDEX idx_supplier_unread (supplier_company_id, is_read),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE supplier_order_status_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    old_status TINYINT,
    new_status TINYINT NOT NULL,
    notes TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials_used(id) ON DELETE CASCADE,
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE supplier_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_company_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    current_stock INT DEFAULT 0,
    min_order_quantity DECIMAL(10,2) DEFAULT 1,
    lead_time_days INT DEFAULT 7,
    is_available BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500),
    specifications JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_company_id) REFERENCES Company(company_id) ON DELETE CASCADE,
    INDEX idx_supplier (supplier_company_id),
    INDEX idx_category (category),
    INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入範例供應商用戶 (使用佔位密碼)
INSERT IGNORE INTO supplier_users (company_id, email, password_hash, contact_person_name)
SELECT
    c.company_id,
    CONCAT(LOWER(REPLACE(c.name, ' ', '')), '@supplier.com') as email,
    '$2b$10$rZ5Z.ZqX6YJZ6YJZ6YJZ6O7vK7vK7vK7vK7vK7vK7vK7vK7vK7vK7v' as password_hash, -- Placeholder
    c.name as contact_person_name
FROM Company c;


-- 4. 詢價單 (RFQ) 系統 (Request For Quotation System)
CREATE TABLE rfq_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    requester_user_id INT NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    required_by_date DATE NOT NULL,
    budget_range_min DECIMAL(10,2),
    budget_range_max DECIMAL(10,2),
    delivery_address TEXT,
    special_requirements TEXT,
    status ENUM('draft', 'published', 'closed', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_required_date (required_by_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rfq_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id INT NOT NULL,
    supplier_company_id BIGINT NOT NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP NULL,
    is_declined BOOLEAN DEFAULT FALSE,
    decline_reason TEXT,
    FOREIGN KEY (rfq_id) REFERENCES rfq_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_company_id) REFERENCES Company(company_id) ON DELETE CASCADE,
    UNIQUE KEY unique_invitation (rfq_id, supplier_company_id),
    INDEX idx_rfq (rfq_id),
    INDEX idx_supplier (supplier_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE supplier_quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id INT NOT NULL,
    supplier_company_id BIGINT NOT NULL,
    supplier_user_id INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    quantity_offered DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_delivery_date DATE NOT NULL,
    validity_days INT DEFAULT 30,
    payment_terms VARCHAR(255),
    notes TEXT,
    attachments JSON,
    status ENUM('draft', 'submitted', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rfq_id) REFERENCES rfq_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_company_id) REFERENCES Company(company_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_user_id) REFERENCES supplier_users(id) ON DELETE CASCADE,
    INDEX idx_rfq (rfq_id),
    INDEX idx_supplier (supplier_company_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quotation_line_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    FOREIGN KEY (quotation_id) REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    INDEX idx_quotation (quotation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rfq_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id INT NOT NULL,
    sender_type ENUM('contractor', 'supplier') NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rfq_id) REFERENCES rfq_requests(id) ON DELETE CASCADE,
    INDEX idx_rfq (rfq_id),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contractor_favorite_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    supplier_product_id INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_product_id) REFERENCES supplier_products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, supplier_product_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 5. 報表檢視 (Reporting Views)
CREATE OR REPLACE VIEW supplier_orders_view AS
SELECT
    mu.id as material_order_id, mu.material_name, mu.vendor as supplier_name,
    mu.qty as quantity, mu.unit, mu.unit_price, (mu.qty * mu.unit_price) as total_value,
    mu.material_status, wi.name as work_item_name, wi.work_date as required_date,
    wi.project_id, p.project_name, p.owner as project_owner,
    CASE mu.material_status
        WHEN 0 THEN 'Delivered'
        WHEN 1 THEN 'In Transit'
        WHEN 2 THEN 'Pending Order'
        WHEN 3 THEN 'Delayed'
        ELSE 'Unknown'
    END as status_label,
    al.expected_date, al.actual_date, al.delivery_status, c.company_id as supplier_company_id
FROM materials_used mu
JOIN work_items wi ON mu.work_item_id = wi.id
JOIN projects p ON wi.project_id = p.id
LEFT JOIN material_arrival_logs al ON mu.id = al.material_id
LEFT JOIN Company c ON LOWER(TRIM(c.name)) = LOWER(TRIM(mu.vendor))
WHERE mu.vendor IS NOT NULL AND mu.vendor != '';

CREATE OR REPLACE VIEW rfq_summary_view AS
SELECT
    r.id as rfq_id, r.project_id, r.material_name, r.quantity, r.unit,
    r.required_by_date, r.status, p.project_name, u.company_name as requester_company,
    COUNT(DISTINCT i.supplier_company_id) as invited_suppliers,
    COUNT(DISTINCT q.id) as received_quotations,
    MIN(q.unit_price) as lowest_quote,
    MAX(q.unit_price) as highest_quote,
    r.created_at
FROM rfq_requests r
JOIN projects p ON r.project_id = p.id
JOIN users u ON r.requester_user_id = u.id
LEFT JOIN rfq_invitations i ON r.id = i.rfq_id
LEFT JOIN supplier_quotations q ON r.id = q.rfq_id AND q.status = 'submitted'
GROUP BY r.id, r.project_id, r.material_name, r.quantity, r.unit,
    r.required_by_date, r.status, p.project_name, u.company_name, r.created_at;

CREATE OR REPLACE VIEW supplier_product_performance AS
SELECT
    sp.id as product_id, sp.product_name, sp.category, sp.price_min, sp.price_max,
    sp.is_available, c.name as supplier_name, c.company_id as supplier_company_id,
    COUNT(DISTINCT q.id) as times_quoted,
    COUNT(CASE WHEN q.status = 'accepted' THEN 1 END) as times_accepted,
    AVG(q.unit_price) as avg_quoted_price
FROM supplier_products sp
JOIN Company c ON sp.supplier_company_id = c.company_id
LEFT JOIN supplier_quotations q ON q.supplier_company_id = sp.supplier_company_id
GROUP BY sp.id, sp.product_name, sp.category, sp.price_min, sp.price_max,
    sp.is_available, c.name, c.company_id;

