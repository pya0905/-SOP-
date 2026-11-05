// js/card.js - 調酒 SOP 規格表核心渲染與即時計算引擎 (支援自由添加、更換、刪除圖片格)

class RecipeCard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = JSON.parse(JSON.stringify(COCKTAIL_PRESETS.jasmineMelon));
    if (!this.data.photos) {
      this.data.photos = this.data.photo ? [this.data.photo] : [];
    }
    this.isManualCostRate = false;
    this.activePhotoReplaceIdx = -1; // -1 表示新增圖片，>=0 表示更換該張圖片

    // 儲存總結列與自訂格子的手動編輯內容 (允許使用者隨意輸入或覆寫)
    this.customOverrides = {
      totalVolume: null,
      weightedABV: null,
      totalCost: null,
      servingsCount: null,
      cupCost: null,
      sumPrice: "",
      sumUnit: "",
      portionAbv: "",
      portionPrice: "",
      portionUnit: "",
      bottomVolume: "",
      bottomAbv: "",
      bottomPrice: "",
      bottomUnit: ""
    };
  }

  /**
   * 載入新資料並重新渲染
   */
  loadData(newData) {
    this.data = {
      ...this.data,
      ...newData
    };
    if (this.data.photo && (!this.data.photos || this.data.photos.length === 0)) {
      this.data.photos = [this.data.photo];
    }
    if (newData.costRate) {
      this.isManualCostRate = true;
    }
    // 重設自訂覆寫
    this.customOverrides = {
      totalVolume: null,
      weightedABV: null,
      totalCost: null,
      servingsCount: null,
      cupCost: null,
      sumPrice: "",
      sumUnit: "",
      portionAbv: "",
      portionPrice: "",
      portionUnit: "",
      bottomVolume: "",
      bottomAbv: "",
      bottomPrice: "",
      bottomUnit: ""
    };
    this.render();
  }

  /**
   * 計算總計數值 (若使用者有手動編輯則優先使用手動輸入值)
   */
  calculateTotals() {
    let calcVolume = 0;
    let totalAlcoholMl = 0;
    let calcCost = 0;

    this.data.ingredients.forEach(ing => {
      const vol = parseFloat(ing.volume) || 0;
      const abv = ing.abv !== null && ing.abv !== undefined && ing.abv !== "" ? parseFloat(ing.abv) : null;
      const price = parseFloat(ing.unitPrice) || 0;
      
      const sub = ing.subtotal !== null && ing.subtotal !== undefined && ing.subtotal !== ""
        ? parseFloat(ing.subtotal)
        : Math.round(vol * price * 100) / 100;

      calcVolume += vol;
      if (abv !== null) {
        totalAlcoholMl += vol * (abv / 100);
      }
      calcCost += sub;
    });

    const calcWeightedABV = calcVolume > 0 && totalAlcoholMl > 0
      ? (totalAlcoholMl / calcVolume * 100).toFixed(1)
      : "";

    const portionSize = parseFloat(this.data.portionSize) || 80;
    const calcServings = portionSize > 0 ? Math.floor(calcVolume / portionSize) : 0;
    const calcCupCost = calcServings > 0 ? Math.round(calcCost / calcServings) : 0;

    // 優先使用使用者手動輸入的值
    const totalVolume = this.customOverrides.totalVolume !== null
      ? this.customOverrides.totalVolume
      : Math.round(calcVolume * 10) / 10;

    const weightedABV = this.customOverrides.weightedABV !== null
      ? this.customOverrides.weightedABV
      : calcWeightedABV;

    const totalCost = this.customOverrides.totalCost !== null
      ? this.customOverrides.totalCost
      : Math.round(calcCost * 10) / 10;

    const servingsCount = this.customOverrides.servingsCount !== null
      ? this.customOverrides.servingsCount
      : calcServings;

    const cupCost = this.customOverrides.cupCost !== null
      ? this.customOverrides.cupCost
      : calcCupCost;

    let displayCostRate = this.data.costRate;
    if (!this.isManualCostRate || !displayCostRate) {
      const sellingPrice = parseFloat(this.data.sellingPrice) || 400;
      if (sellingPrice > 0 && cupCost > 0) {
        displayCostRate = ((cupCost / sellingPrice) * 100).toFixed(2) + "%";
      } else {
        displayCostRate = "6.50%";
      }
    }

    return {
      totalVolume,
      weightedABV,
      totalCost,
      servingsCount,
      cupCost,
      displayCostRate,
      sumPrice: this.customOverrides.sumPrice || "",
      sumUnit: this.customOverrides.sumUnit || "",
      portionAbv: this.customOverrides.portionAbv || "",
      portionPrice: this.customOverrides.portionPrice || "",
      portionUnit: this.customOverrides.portionUnit || "",
      bottomVolume: this.customOverrides.bottomVolume || "",
      bottomAbv: this.customOverrides.bottomAbv || "",
      bottomPrice: this.customOverrides.bottomPrice || "",
      bottomUnit: this.customOverrides.bottomUnit || ""
    };
  }

  /**
   * 渲染 SOP 規格卡 (嚴格 100% 依據圖片中設計排版，支援自由添加與刪除圖片)
   */
  render() {
    const totals = this.calculateTotals();
    const ings = this.data.ingredients;
    const N = Math.max(ings.length, 7);

    // 動態列數劃分
    const photoSpan = Math.max(1, N - 3);
    const cupHeaderRow = photoSpan;
    const cupMethodSpan = N - (cupHeaderRow + 1);
    const totalDataRows = N + 3;

    // 準備照片列表
    const photos = Array.isArray(this.data.photos)
      ? this.data.photos
      : (this.data.photo ? [this.data.photo] : []);

    let html = `
    <div id="sop-card" class="sop-card-frame">
      <table class="sop-table" id="sop-table-dom">
        <thead>
          <tr class="sop-header-row">
            <th colspan="2" class="th-left-header">酒名</th>
            <th class="th-material">材料</th>
            <th class="th-volume">總容量(ml)</th>
            <th class="th-abv">酒精濃度(abv)</th>
            <th class="th-price">單價</th>
            <th class="th-unit">單位</th>
            <th class="th-subtotal">小計</th>
            <th class="th-batch">作法</th>
          </tr>
        </thead>
        <tbody>
    `;

    // 逐列渲染材料列 (i: 0 到 N-1)
    for (let i = 0; i < N; i++) {
      const ing = ings[i] || { name: "", volume: "", abv: "", unitPrice: "", unit: "", subtotal: "" };
      const abvDisplay = ing.abv !== null && ing.abv !== undefined ? ing.abv : "";

      html += `<tr class="ing-row" data-row-index="${i}">`;

      // 左側區塊：依照嚴格設計精確對齊
      if (i === 0) {
        // 酒名 + 圖片區塊 (支援自由添加與刪除圖片)
        let photoHtml = "";
        if (photos.length > 0) {
          photoHtml = `
            <div class="cocktail-photos-list">
              ${photos.map((src, pIdx) => `
                <div class="cocktail-photo-wrapper" data-photo-idx="${pIdx}" title="點擊更換照片 / 點右上角✕刪除">
                  <img src="${src}" alt="調酒照片 ${pIdx + 1}" class="cocktail-img" />
                  <button type="button" class="btn-del-photo" data-photo-idx="${pIdx}" title="刪除此圖片">✕</button>
                  <div class="photo-overlay" data-photo-idx="${pIdx}"><span class="photo-overlay-text">更換照片</span></div>
                </div>
              `).join("")}
              <div class="photo-mini-add" title="添加另一張調酒照片" id="btn-add-more-photo">
                <span>+ 加圖</span>
              </div>
            </div>
          `;
        } else {
          // 圖片格已刪除時的乾淨佔位按鈕 (僅在編輯模式顯示，匯出時自動隱藏)
          photoHtml = `
            <div class="photo-placeholder-wrapper" id="btn-add-first-photo" title="點擊添加調酒照片 / 支援 Ctrl+V 貼上截圖">
              <span class="photo-add-icon">📷</span>
              <span class="photo-add-text">+ 添加圖片</span>
            </div>
          `;
        }

        html += `
          <td colspan="2" rowspan="${photoSpan}" class="td-cocktail-info">
            <div class="cocktail-name" contenteditable="true" data-field="name">${this.renderRichContent(this.data.name)}</div>
            ${photoHtml}
            <input type="file" id="cocktail-photo-input" accept="image/*" style="display:none;" />
          </td>
        `;
      } else if (i === cupHeaderRow) {
        // 出杯作法標題列 (灰底)
        html += `
          <td colspan="2" class="td-section-header">作法</td>
        `;
      } else if (i === cupHeaderRow + 1) {
        // 出杯作法內容 (跨 cupMethodSpan 列)
        html += `
          <td colspan="2" rowspan="${cupMethodSpan}" class="td-cup-method" contenteditable="true" data-field="cupMethod">${this.renderRichContent(this.data.cupMethod)}</td>
        `;
      }

      // 中間 6 欄材料明細 (可直接在線上點擊修改)
      html += `
        <td class="td-material-name" contenteditable="true" data-ing-idx="${i}" data-field="name">${this.renderRichContent(ing.name)}</td>
        <td class="td-number" contenteditable="true" data-ing-idx="${i}" data-field="volume">${ing.volume !== "" && ing.volume !== null ? ing.volume : ""}</td>
        <td class="td-number" contenteditable="true" data-ing-idx="${i}" data-field="abv">${abvDisplay}</td>
        <td class="td-number" contenteditable="true" data-ing-idx="${i}" data-field="unitPrice">${ing.unitPrice !== "" && ing.unitPrice !== null ? ing.unitPrice : ""}</td>
        <td class="td-unit" contenteditable="true" data-ing-idx="${i}" data-field="unit">${this.escapeHtml(ing.unit || "")}</td>
        <td class="td-subtotal-val" contenteditable="true" data-ing-idx="${i}" data-field="subtotal">${ing.subtotal !== "" && ing.subtotal !== null ? ing.subtotal : ""}</td>
      `;

      // 右側：作法區塊 (在第 0 列時注入，跨全部 N+3 列)
      if (i === 0) {
        html += `
          <td rowspan="${totalDataRows}" class="td-batch-method" contenteditable="true" data-field="batchMethod">${this.renderRichContent(this.data.batchMethod)}</td>
        `;
      }

      html += `</tr>`;
    }

    // 總結列 1: 總計 (全欄位支援可編輯)
    html += `
      <tr class="summary-row summary-row-1">
        <td colspan="2" class="td-section-header">裝飾</td>
        <td class="td-summary-title">總計</td>
        <td class="td-summary-num" contenteditable="true" data-field="totalVolume" title="點擊可直接修改總容量">${totals.totalVolume}</td>
        <td class="td-summary-num" contenteditable="true" data-field="weightedABV" title="點擊可直接修改酒精濃度">${totals.weightedABV}</td>
        <td class="td-empty" contenteditable="true" data-field="sumPrice" title="點擊可輸入內容">${this.escapeHtml(totals.sumPrice)}</td>
        <td class="td-empty" contenteditable="true" data-field="sumUnit" title="點擊可輸入內容">${this.escapeHtml(totals.sumUnit)}</td>
        <td class="td-summary-num" contenteditable="true" data-field="totalCost" title="點擊可直接修改總小計">${totals.totalCost}</td>
      </tr>
    `;

    // 總結列 2: 每份容量 / 總份數 (全欄位支援可編輯)
    html += `
      <tr class="summary-row summary-row-2">
        <td colspan="2" class="td-garnish-content" contenteditable="true" data-field="garnish">${this.escapeHtml(this.data.garnish)}</td>
        <td class="td-summary-title">每份容量/總份數</td>
        <td class="td-summary-num" contenteditable="true" data-field="portionSize" title="點擊可直接修改每份容量">${this.data.portionSize}</td>
        <td class="td-empty" contenteditable="true" data-field="portionAbv" title="點擊可輸入內容">${this.escapeHtml(totals.portionAbv)}</td>
        <td class="td-empty" contenteditable="true" data-field="portionPrice" title="點擊可輸入內容">${this.escapeHtml(totals.portionPrice)}</td>
        <td class="td-empty" contenteditable="true" data-field="portionUnit" title="點擊可輸入內容">${this.escapeHtml(totals.portionUnit)}</td>
        <td class="td-summary-num" contenteditable="true" data-field="servingsCount" title="點擊可直接修改總份數">${totals.servingsCount}</td>
      </tr>
    `;

    // 總結列 3: 單杯成本 (底部高跨距區塊，全欄位均設為可編輯儲存格)
    html += `
      <tr class="summary-row summary-row-bottom">
        <td class="td-cost-rate-label" contenteditable="true" data-field="costRateLabel">成本率</td>
        <td class="td-cost-rate-val" contenteditable="true" data-field="costRate" title="點擊可直接修改成本率">${totals.displayCostRate}</td>
        <td class="td-single-cup-cost-title" contenteditable="true" data-field="singleCupCostTitle">單杯成本</td>
        <td class="td-bottom-empty" contenteditable="true" data-field="bottomVolume" title="點擊可輸入內容">${this.escapeHtml(totals.bottomVolume)}</td>
        <td class="td-bottom-empty" contenteditable="true" data-field="bottomAbv" title="點擊可輸入內容">${this.escapeHtml(totals.bottomAbv)}</td>
        <td class="td-bottom-empty" contenteditable="true" data-field="bottomPrice" title="點擊可輸入內容">${this.escapeHtml(totals.bottomPrice)}</td>
        <td class="td-bottom-empty" contenteditable="true" data-field="bottomUnit" title="點擊可輸入內容">${this.escapeHtml(totals.bottomUnit)}</td>
        <td class="td-single-cup-cost-val" contenteditable="true" data-field="cupCost" title="點擊可直接修改單杯成本">${totals.cupCost}</td>
      </tr>
    `;

    html += `
        </tbody>
      </table>
    </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * 綁定可編輯儲存格、照片更換與刪除事件
   */
  attachEventListeners() {
    const photoInput = this.container.querySelector("#cocktail-photo-input");

    // 1. 刪除圖片按鈕
    this.container.querySelectorAll(".btn-del-photo").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pIdx = parseInt(btn.dataset.photoIdx, 10);
        if (Array.isArray(this.data.photos)) {
          this.data.photos.splice(pIdx, 1);
          this.data.photo = this.data.photos.length > 0 ? this.data.photos[0] : null;
        } else {
          this.data.photo = null;
          this.data.photos = [];
        }
        this.render();
      });
    });

    // 2. 更換現有圖片
    this.container.querySelectorAll(".photo-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        e.stopPropagation();
        this.activePhotoReplaceIdx = parseInt(overlay.dataset.photoIdx, 10);
        if (photoInput) photoInput.click();
      });
    });

    // 3. 添加第一張圖片
    const btnAddFirst = this.container.querySelector("#btn-add-first-photo");
    if (btnAddFirst && photoInput) {
      btnAddFirst.addEventListener("click", () => {
        this.activePhotoReplaceIdx = -1;
        photoInput.click();
      });
    }

    // 4. 添加更多圖片按鈕
    const btnAddMore = this.container.querySelector("#btn-add-more-photo");
    if (btnAddMore && photoInput) {
      btnAddMore.addEventListener("click", () => {
        this.activePhotoReplaceIdx = -1;
        photoInput.click();
      });
    }

    // 5. 檔案選擇器回調
    if (photoInput) {
      photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const newImg = evt.target.result;
            if (!Array.isArray(this.data.photos)) {
              this.data.photos = [];
            }

            if (this.activePhotoReplaceIdx >= 0 && this.activePhotoReplaceIdx < this.data.photos.length) {
              // 更換特定照片
              this.data.photos[this.activePhotoReplaceIdx] = newImg;
            } else {
              // 添加新照片
              this.data.photos.push(newImg);
            }
            this.data.photo = this.data.photos[0];
            this.render();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // 6. 儲存格內容變更即時連動
    const editables = this.container.querySelectorAll("[contenteditable=true]");
    editables.forEach(el => {
      el.addEventListener("blur", () => {
        this.handleCellEdit(el);
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !el.dataset.field?.includes("Method")) {
          e.preventDefault();
          el.blur();
        }
      });
    });
  }

  /**
   * 處理單一格子的編輯與重新計算
   */
  handleCellEdit(el) {
    const field = el.dataset.field;
    const ingIdx = el.dataset.ingIdx;
    const textVal = el.innerText.trim();

    if (ingIdx !== undefined) {
      // 編輯材料明細列
      const idx = parseInt(ingIdx, 10);
      if (!this.data.ingredients[idx]) {
        this.data.ingredients[idx] = { name: "", volume: 0, abv: null, unitPrice: 0, unit: "毫升", subtotal: 0 };
      }
      const ing = this.data.ingredients[idx];

      if (field === "name" || field === "unit") {
        ing[field] = textVal;
      } else if (field === "volume" || field === "abv" || field === "unitPrice") {
        const num = textVal !== "" ? parseFloat(textVal) : null;
        ing[field] = isNaN(num) ? null : num;
        
        // 若更改了 volume 或 unitPrice，自動重算小計
        if (ing.volume !== null && ing.unitPrice !== null) {
          ing.subtotal = Math.round(ing.volume * ing.unitPrice * 100) / 100;
        }
      } else if (field === "subtotal") {
        const num = parseFloat(textVal);
        ing.subtotal = isNaN(num) ? 0 : num;
      }

      this.render();
    } else if (field) {
      // 編輯全域或總結列欄位
      if (field in this.customOverrides) {
        if (textVal === "" && ["totalVolume", "weightedABV", "totalCost", "servingsCount", "cupCost"].includes(field)) {
          this.customOverrides[field] = null;
        } else {
          this.customOverrides[field] = textVal;
        }
        this.render();
      } else if (field === "portionSize") {
        const p = parseFloat(textVal);
        if (!isNaN(p) && p > 0) this.data.portionSize = p;
        this.render();
      } else if (field === "costRate") {
        this.data.costRate = textVal;
        this.isManualCostRate = true;
      } else if (field === "cupMethod" || field === "batchMethod") {
        this.data[field] = el.innerHTML;
      } else if (field === "name" || field === "garnish") {
        this.data[field] = el.innerHTML;
      }
    }
  }

  /**
   * 渲染富文字內容 (支援粗體、顏色標籤與斷行)
   */
  renderRichContent(str) {
    if (!str) return "";
    // 若已包含 HTML 標籤 (如 <span>, <b>, <strong>, <i>, <u>, <font> 等)，直接原樣輸出
    if (/<[a-z][\s\S]*>/i.test(str)) {
      return str;
    }
    return this.escapeHtml(str).replace(/\n/g, "<br>");
  }

  /**
   * 新增一列材料
   */
  addIngredientRow() {
    this.data.ingredients.push({
      name: "新材料",
      volume: 100,
      abv: null,
      unitPrice: 0.1,
      unit: "毫升",
      subtotal: 10
    });
    this.render();
  }

  /**
   * 移除最後一列材料
   */
  removeLastIngredientRow() {
    if (this.data.ingredients.length > 1) {
      this.data.ingredients.pop();
      this.render();
    }
  }

  /**
   * 輔助函式：逸出 HTML 特殊字元
   */
  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
