```mermaid
graph TD
    style A fill:#F08080,stroke:#333,stroke-width:2px,color:#000
    style B fill:#F08080,stroke:#333,stroke-width:2px,color:#000
    style C fill:#F08080,stroke:#333,stroke-width:2px,color:#000
    style D fill:#F08080,stroke:#333,stroke-width:2px,color:#000
    style E fill:#F08080,stroke:#333,stroke-width:2px,color:#000
    style F fill:#F08080,stroke:#333,stroke-width:2px,color:#000
    
    %% P2 (orange)
    style G fill:#FFA500,stroke:#333,stroke-width:2px,color:#000
    style H fill:#FFA500,stroke:#333,stroke-width:2px,color:#000
    
    %% P3 (green)
    style I fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style J fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style K fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style L fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style M fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style N fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style O fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style P fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style Q fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style R fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style S fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style T fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style U fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style V fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    style W fill:#90EE90,stroke:#333,stroke-width:2px,color:#000
    
    A["Login Page<br>入口/登入頁面<br>負責人: Lee Meng Hsun"] --> B("Registration Page<br>註冊頁面<br>負責人: Lee Meng Hsun")
    A --> C("Project Dashboard<br>專案管理首頁<br>負責人: Lee Meng Hsun")
    
    C --> D("Progress Tracking<br>專案進度追蹤<br>負責人: Lee Meng Hsun")
    C --> E("Add Work Item<br>新增工項<br>負責人: Lee Meng Hsun")
    C --> F("Edit Work Item<br>工項編輯<br>負責人: Lee Meng Hsun")
    C --> G("Material Overview<br>材料總覽<br>負責人: Zi Yi Yang")
    C --> H("Vendor Management<br>供應商管理頁面<br>負責人: Zi Yi Yang ")
    
    %% Material Overview branches
    G --> I("Material Arrival Log<br>材料進貨時間紀錄<br>負責人: Steven Gaillard")
    G --> J("Material Quality Score<br>材料品質評分<br>負責人: Steven Gaillard")
    G --> L("Material Inventory Tracking<br>材料庫存追蹤<br>負責人: Steven Gaillard")
    G --> M("Material Cost Analysis<br>材料成本分析<br>負責人: Steven Gaillard")
    
    %% Material Arrival Log sub-branches
    I --> N("Delivery Schedule Management<br>交貨時程管理<br>負責人: Steven Gaillard")
    I --> O("Delayed Shipment Alerts<br>延遲出貨警示<br>負責人: Steven Gaillard")
    
    %% Material Quality Score sub-branches
    J --> P("Quality Inspection Checklist<br>品質檢驗清單<br>負責人: Steven Gaillard")
    J --> Q("Defect Report System<br>瑕疵回報系統<br>負責人: Steven Gaillard")
    J --> R("Material Testing Results<br>材料測試結果<br>負責人: Steven Gaillard")
    
    %% Material Inventory Tracking sub-branches
    L --> S("Stock Level Monitoring<br>庫存水位監控<br>負責人: Steven Gaillard")
    L --> T("Reorder Point Alerts<br>補貨點提醒<br>負責人: Steven Gaillard")
    
    %% Vendor Management branches
    H --> K("Vendor Rating History<br>供應商評分紀錄<br>負責人: Zi Yi Yang")
    H --> U("Vendor Performance Dashboard<br>供應商績效儀表板<br>負責人: Zi Yi Yang")
    
    %% Vendor Rating History sub-branches
    K --> V("Delivery Punctuality Metrics<br>交貨準時率指標<br>負責人: Zi Yi Yang")
    K --> W("Price Competitiveness Analysis<br>價格競爭力分析<br>負責人: Zi Yi Yang")
