// js/pages/detail/materials.js

import { state } from '../../app.js';
import { MAT_STATUS } from '../../constants.js';

function getMaterialsElements() {
    return {
        materialsTableTbody: document.querySelector("#materialsTable tbody")
    };
}

/** 渲染材料總管表格 */
export function renderMaterialsTable(){
  const { materialsTableTbody } = getMaterialsElements();
    
  const proj=state.currentProject;
  const rows=[];
  
  (proj.progress||[]).forEach(dn=>{
    (dn.items||[]).forEach(it=>{
      (it.materials||[]).forEach(m=>{
        rows.push({ name:m.name, vendor:m.vendor, qty:m.qty, unit:m.unit,
          status: MAT_STATUS[m.mstatus] ?? "-", date:dn.date, work:it.name });
      });
    });
  });
  
  materialsTableTbody.innerHTML = rows.length
    ? rows.map(r=>`<tr>
        <td>${r.name}</td><td>${r.vendor||"-"}</td><td>${r.qty}</td>
        <td>${r.unit||"-"}</td><td>${r.status}</td><td>${r.date}</td><td>${r.work}</td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="muted">尚無建材資料</td></tr>`;
}
