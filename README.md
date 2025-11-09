# Lab-G1
```mermaid
graph TD
    %% P1 (red) 
    style A fill:#F08080,stroke:#333,stroke-width:2px
    style B fill:#F08080,stroke:#333,stroke-width:2px
    style C fill:#F08080,stroke:#333,stroke-width:2px
    style D fill:#F08080,stroke:#333,stroke-width:2px
    style E fill:#F08080,stroke:#333,stroke-width:2px
    style F fill:#F08080,stroke:#333,stroke-width:2px
    
    %% P2 (orange)
    style G fill:#FFA500,stroke:#333,stroke-width:2px
    style H fill:#FFA500,stroke:#333,stroke-width:2px
    
    %% P3 (green)
    style I fill:#90EE90,stroke:#333,stroke-width:2px
    style J fill:#90EE90,stroke:#333,stroke-width:2px
    style K fill:#90EE90,stroke:#333,stroke-width:2px

    %% 網站主要頁面架構和負責人（假設）
    A["Login Page<br>入口/登入頁面<br>負責人: Lee Meng Hsun"] --> B("Registration Page<br>註冊頁面<br>負責人: Lee Meng Hsun")
    A --> C("Project Dashboard<br>專案管理首頁<br>負責人: Lee Meng Hsun")

    %% 專案管理首頁 (C) 連接的功能
    C --> D("Progress Tracking<br>專案進度追蹤<br>負責人: Lee Meng Hsun")
    C --> E("Add Work Item<br>新增工項<br>負責人: Lee Meng Hsun")
    C --> F("Edit Work Item<br>工項編輯<br>負責人: Lee Meng Hsun")
    C --> G("Material Overview<br>材料總覽<br>負責人: ")
    C --> H("Vendor Management<br>供應商管理頁面<br>負責人: ")

    %% 從材料總覽 (G) 延伸的功能
    G --> I("Material Arrival Log<br>材料進貨時間紀錄<br>負責人: ")
    G --> J("Material Quality Score<br>材料品質評分<br>負責人: ")

    %% 從供應商管理 (H) 延伸的功能
    H --> K("Vendor Rating History<br>供應商評分紀錄<br>負責人: ")
