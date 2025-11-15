// 對照表
export const WORK_STATUS = ["提前", "正常", "延後"];
export const MAT_STATUS  = ["已到貨", "已叫貨", "未叫貨", "已叫貨但未抵達"];

// 假資料
export const PROJECTS = [
  {
    id: "p-001",
    name: "社會住宅",
    tags: ["住宅", "房屋", "公寓"],
    owner: "G1",
    overview: "社會住宅新建工程。",
    progress: [
      {
        date: "2025-09-20",
        items: [
          { name:"磁磚地坪鋪設", start:"09:00", status:1,
            materials:[{ name:"60x60拋光磚", vendor:"A磚行", qty:120, unit:"片", mstatus:0 }] },
          { name:"室內木門安裝", start:"09:00", status:1,
            materials:[{ name:"木門", vendor:"B木作", qty:8, unit:"扇", mstatus:0 }] },
          { name:"牆面油漆粉刷", start:"13:00", status:2,
            materials:[{ name:"乳膠漆", vendor:"C塗料", qty:25, unit:"L", mstatus:2 }]
          }
        ]
      },
      {
        date: "2025-09-21",
        items: [
          { name:"落地窗安裝", start:"09:00", status:1,
            materials:[{ name:"180x200落地窗", vendor:"D門窗", qty:12, unit:"扇", mstatus:0 }] },
          { name:"廚房廚具安裝", start:"11:00", status:1,
            materials:[{ name:"電磁爐", vendor:"E廚具", qty:1, unit:"座", mstatus:0 }] }
        ]
      }
    ]
  }
];