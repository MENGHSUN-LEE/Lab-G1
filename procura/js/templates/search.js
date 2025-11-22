// js/templates/search.js

/** 匯出搜尋頁面的 HTML 結構 */
export const searchTemplate = `
    <section id="page-search" class="card stack hidden">
      <h2>Project List</h2>
      
      <div class="grid cols-3"> 
        <div class="stack">
          <label>Project</label>
          <input id="q" type="text" placeholder="Enter project name or tags..." />
        </div>
        <div class="stack">
          <label>&nbsp;</label>
          <div style="display: flex; gap: 8px;">
              <button id="searchBtn" class="btn"><span class="material-symbols-outlined">search</span> Search</button>
              
              <button id="toggleCreateFormBtn" class="btn-primary">
                <span class="material-symbols-outlined">add</span> Add
              </button>
          </div>
        </div>
      </div>
      
      <hr />

      <div id="createProjectSection" class="stack hidden">
          <div class="grid cols-3 gap-16">
              <div class="stack">
                  <label for="newProjectName">Project Name</label>
                  <input type="text" id="newProjectName" placeholder="e.g. Social Housing Project C" required />
              </div>
              <div class="stack">
                  <label for="newProjectTags">#Tags</label>
                  <input type="text" id="newProjectTags" placeholder="e.g. Residential,Housing" required />
              </div>
              <div class="stack">
                  <label for="newProjectOwner">Owner</label>
                  <input type="text" id="newProjectOwner" placeholder="e.g. G1" required />
              </div>
          </div>
          <div class="actions" style="margin-top: 12px;"> 
              <button id="createProjectBtn" class="btn-primary">
                <span class="material-symbols-outlined" style="font-size: 1em;">add_box</span> Create
              </button>
          </div>
      </div>

      <hr /> 
      
      <div id="result" class="list">
      </div>
    </section>
`;