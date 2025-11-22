// 工項狀態：0: 提前 (Ahead), 1: 正常 (On Time), 2: 延後 (Delayed)
export const WORK_STATUS = ["Ahead", "On Time", "Delayed"];

// 建材狀態：0: 已到貨 (Arrived), 1: 已叫貨 (Ordered), 2: 未叫貨 (Pending Order), 3: 已叫貨但未抵達 (In Transit)
export const MAT_STATUS = ["Arrived", "Ordered", "Pending Order", "In Transit"];

export const MATERIAL_CATEGORIES = [
    { id: 1, name: 'Quality management' },
    { id: 2, name: 'Product' },
    { id: 3, name: 'Machine' },
    { id: 4, name: 'Technician' },
    { id: 5, name: 'Other' }
];