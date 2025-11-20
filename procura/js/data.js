// 對照表
export const WORK_STATUS = ["Early", "On time", "Delayed"];
export const MAT_STATUS  = ["Delivered", "Ordered", "Pending Order", "In Transit"];

// 假資料
export const PROJECTS = [
  {
    id: "p-001",
    name: "Social Housing Project A",
    tags: ["Residential", "Housing", "Apartment"],
    owner: "G1",
    overview: "New social housing construction projects.",
    progress: [
      {
        date: "2025-09-20",
        items: [
          { name:"Tile Flooring Installation", start:"09:00", status:1,
            materials:[{ name:"60x60 Polished Tile", vendor:"A Tile Supply", qty:120, unit:"PCS", mstatus:0 }] },
          { name:"Interior Wooden Door Installation", start:"09:00", status:1,
            materials:[{ name:"Wooden Door", vendor:"B Carpentry", qty:8, unit:"Set", mstatus:0 }] },
          { name:"Wall Painting and Brushing", start:"13:00", status:2,
            materials:[{ name:"Latex Paint", vendor:"C Coating Supplier", qty:25, unit:"L", mstatus:2 }]
          }
        ]
      },
      {
        date: "2025-09-21",
        items: [
          { name:"French Window Installation", start:"09:00", status:1,
            materials:[{ name:"180x200 French Window", vendor:"D Window Supply", qty:12, unit:"Set", mstatus:0 }] },
          { name:"Kitchen Cabinet Installation", start:"11:00", status:1,
            materials:[{ name:"Induction Cooktop", vendor:"E Kitchenware", qty:1, unit:"Unit", mstatus:0 }] }
        ]
      }
    ]
  }
];