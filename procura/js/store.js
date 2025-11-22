// js/store.js
// Centralized Data Store

export const Store = {
  materials: [
    { id: 1, name: '鋼筋 #4', vendor: '台北鋼鐵', quantity: 500, unit: '支', status: 'arrived', date: '2024-03-15', task: '基礎工程' },
    { id: 2, name: '水泥 (波特蘭)', vendor: '亞洲水泥', quantity: 200, unit: '包', status: 'arrived', date: '2024-03-14', task: '基礎工程' },
    { id: 3, name: '紅磚', vendor: '新竹磚窯', quantity: 5000, unit: '塊', status: 'transit', date: '2024-03-18', task: '砌牆工程' },
    { id: 4, name: '砂石', vendor: '大安砂石場', quantity: 50, unit: '噸', status: 'arrived', date: '2024-03-12', task: '基礎工程' },
    { id: 5, name: 'PVC水管 4"', vendor: '南亞塑膠', quantity: 100, unit: '支', status: 'transit', date: '2024-03-20', task: '水電工程' },
    { id: 6, name: '電纜線 2.0mm', vendor: '大同電線', quantity: 2000, unit: '米', status: 'pending', date: '2024-03-25', task: '水電工程' },
    { id: 7, name: '木模板', vendor: '林氏木業', quantity: 300, unit: '片', status: 'arrived', date: '2024-03-10', task: '模板工程' },
    { id: 8, name: '防水塗料', vendor: '虹牌油漆', quantity: 50, unit: '桶', status: 'pending', date: '2024-03-28', task: '防水工程' }
  ],
  
  vendors: [
    { id: 1, name: '台北鋼鐵', contact: '張志明', phone: '02-2345-6789', email: 'contact@tpsteel.com', rating: 9.2 },
    { id: 2, name: '亞洲水泥', contact: '李美玲', phone: '02-8765-4321', email: 'service@asiacement.com', rating: 8.8 },
    { id: 3, name: '新竹磚窯', contact: '陳大偉', phone: '03-5678-1234', email: 'sales@hcbrick.com', rating: 8.5 },
    { id: 4, name: '南亞塑膠', contact: '王小華', phone: '02-2222-3333', email: 'pvc@nanya.com', rating: 9.0 }
  ],

  projects: [
    { id: 1, name: '台北101新建案', manager: '張三', startDate: '2024-01-15', status: 1, completion: 75 },
    { id: 2, name: '新竹科技園區', manager: '李四', startDate: '2024-03-01', status: 1, completion: 45 },
    { id: 3, name: '高雄港區開發', manager: '王五', startDate: '2024-02-10', status: 0, completion: 100 }
  ],

  // Helper methods
  getMaterialsByStatus(status) {
    return this.materials.filter(m => m.status === status);
  },

  getMaterialStats() {
    return {
      total: this.materials.length,
      arrived: this.materials.filter(m => m.status === 'arrived').length,
      transit: this.materials.filter(m => m.status === 'transit').length,
      pending: this.materials.filter(m => m.status === 'pending').length
    };
  },

  addMaterial(material) {
    const newId = Math.max(...this.materials.map(m => m.id), 0) + 1;
    this.materials.push({ ...material, id: newId });
    return newId;
  },

  updateMaterial(id, updates) {
    const index = this.materials.findIndex(m => m.id === id);
    if (index !== -1) {
      this.materials[index] = { ...this.materials[index], ...updates };
      return true;
    }
    return false;
  },

  deleteMaterial(id) {
    const index = this.materials.findIndex(m => m.id === id);
    if (index !== -1) {
      this.materials.splice(index, 1);
      return true;
    }
    return false;
  }
};