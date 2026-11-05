// js/app.js - 應用程式主要進入點與互動控制

document.addEventListener("DOMContentLoaded", () => {
  // 1. 初始化卡片實例
  const card = new RecipeCard("card-container");
  card.render();

  // 2. 取得 DOM 元件
  const rawInput = document.getElementById("raw-input");
  const btnGenerate = document.getElementById("btn-generate");
  const btnClear = document.getElementById("btn-clear");
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const portionInput = document.getElementById("param-portion");
  const priceInput = document.getElementById("param-price");
  const geminiKeyInput = document.getElementById("gemini-api-key");
  const statusToast = document.getElementById("status-toast");

  // 匯出按鈕
  const btnExportPdf = document.getElementById("btn-export-pdf");
  const btnExportExcel = document.getElementById("btn-export-excel");
  const btnExportWord = document.getElementById("btn-export-word");
  const btnExportPng = document.getElementById("btn-export-png");
  const btnExportJpg = document.getElementById("btn-export-jpg");
  const btnPrint = document.getElementById("btn-print");
  const btnAddRow = document.getElementById("btn-add-row");
  const btnRemoveRow = document.getElementById("btn-remove-row");
  const btnTogglePhoto = document.getElementById("btn-toggle-photo");
  const btnDeletePhotoTool = document.getElementById("btn-delete-photo-tool");

  // 頂部圖片工具按鈕
  if (btnTogglePhoto) {
    btnTogglePhoto.addEventListener("click", () => {
      const input = document.getElementById("cocktail-photo-input");
      if (input) {
        card.activePhotoReplaceIdx = -1;
        input.click();
      }
    });
  }

  if (btnDeletePhotoTool) {
    btnDeletePhotoTool.addEventListener("click", () => {
      card.data.photo = null;
      card.data.photos = [];
      card.render();
      showToast("已刪除調酒圖片格", "info");
    });
  }

  // 讀取儲存的 Gemini API Key (若有)
  const savedKey = localStorage.getItem("cocktail_sop_gemini_key");
  if (savedKey && geminiKeyInput) {
    geminiKeyInput.value = savedKey;
  }

  // 提示訊息小工具
  function showToast(msg, type = "info") {
    if (!statusToast) return;
    statusToast.textContent = msg;
    statusToast.className = `status-toast show ${type}`;
    setTimeout(() => {
      statusToast.className = "status-toast";
    }, 3500);
  }

  // 3. 範本快速載入
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetKey = btn.dataset.preset;
      if (COCKTAIL_PRESETS[presetKey]) {
        const data = JSON.parse(JSON.stringify(COCKTAIL_PRESETS[presetKey]));
        card.loadData(data);
        if (portionInput) portionInput.value = data.portionSize;
        if (priceInput) priceInput.value = data.sellingPrice;
        
        // 同步填入文字輸入框供使用者參考
        rawInput.value = formatDataToText(data);
        showToast(`已載入範本: ${data.name}`, "success");
      }
    });
  });

  // 將資料轉回易讀格式填入文字框
  function formatDataToText(data) {
    let lines = [];
    lines.push(`酒名: ${data.name}`);
    lines.push(`每份容量: ${data.portionSize} ml`);
    lines.push(`單杯售價: ${data.sellingPrice} 元`);
    lines.push(`裝飾: ${data.garnish}`);
    lines.push("");
    lines.push("【出杯作法】");
    lines.push(data.cupMethod);
    lines.push("");
    lines.push("【材料清單】");
    lines.push("材料\t容量\tabv\t單價\t單位\t小計");
    data.ingredients.forEach(i => {
      lines.push(`${i.name}\t${i.volume}\t${i.abv ?? ""}\t${i.unitPrice}\t${i.unit}\t${i.subtotal}`);
    });
    lines.push("");
    lines.push("【批次與自製材料作法】");
    lines.push(data.batchMethod);
    return lines.join("\n");
  }

  // 4. 生成 SOP 按鈕 (支援本地啟發式或 Gemini AI)
  btnGenerate.addEventListener("click", async () => {
    const text = rawInput.value.trim();
    if (!text) {
      showToast("請先輸入或貼上調酒資料", "warning");
      return;
    }

    const apiKey = geminiKeyInput ? geminiKeyInput.value.trim() : "";
    if (apiKey) {
      localStorage.setItem("cocktail_sop_gemini_key", apiKey);
    }

    // 若有填寫 API Key 則啟動 Gemini AI 模式
    if (apiKey) {
      try {
        btnGenerate.disabled = true;
        btnGenerate.innerHTML = "🤖 Gemini AI 深度解析中...";
        showToast("Gemini 正在智能分析配方結構...", "info");
        
        const parsed = await RecipeParser.parseWithGemini(text, apiKey);
        if (portionInput.value) parsed.portionSize = parseFloat(portionInput.value);
        if (priceInput.value) parsed.sellingPrice = parseFloat(priceInput.value);
        card.loadData(parsed);
        showToast("✨ Gemini AI 智能解析生成成功！", "success");
        if (window.innerWidth < 992) switchMobileTab("preview");
      } catch (err) {
        console.error("Gemini 解析失敗:", err);
        showToast(`Gemini 解析失敗 (${err.message})，已自動切換本地引擎`, "warning");
        // 自動降級切換回本地解析引擎
        const localParsed = RecipeParser.parseText(text);
        if (portionInput.value) localParsed.portionSize = parseFloat(portionInput.value);
        if (priceInput.value) localParsed.sellingPrice = parseFloat(priceInput.value);
        card.loadData(localParsed);
        if (window.innerWidth < 992) switchMobileTab("preview");
      } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = "🚀 生成 SOP 流程圖";
      }
    } else {
      // 毫秒級本地啟發式解析
      try {
        const parsed = RecipeParser.parseText(text);
        if (portionInput.value) parsed.portionSize = parseFloat(portionInput.value);
        if (priceInput.value) parsed.sellingPrice = parseFloat(priceInput.value);
        card.loadData(parsed);
        showToast("✅ 本地引擎已成功生成 SOP 流程圖！", "success");
        if (window.innerWidth < 992) switchMobileTab("preview");
      } catch (err) {
        console.error(err);
        showToast("解析失敗，請檢查資料格式", "error");
      }
    }
  });

  // 清空輸入
  btnClear.addEventListener("click", () => {
    rawInput.value = "";
    showToast("已清空輸入框", "info");
  });

  // 5. 檔案拖放與上傳處理
  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadedFile(e.target.files[0]);
    }
  });

  // 支援全域貼上截圖照片 (Ctrl+V)
  window.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (evt) => {
            card.data.photo = evt.target.result;
            card.render();
            showToast("已從剪貼簿貼上調酒照片！", "success");
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  });

  function handleUploadedFile(file) {
    const fileName = file.name.toLowerCase();
    showToast(`正在讀取檔案: ${file.name}...`, "info");

    // 1. 照片圖檔 -> 直接設定調酒杯照
    if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(fileName)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        card.data.photo = e.target.result;
        card.render();
        showToast("已更新調酒杯照！", "success");
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. Excel 活頁簿 (.xlsx, .xls)
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = RecipeParser.parseExcel(e.target.result);
          rawInput.value = formatDataToText(parsed);
          card.loadData(parsed);
          showToast("已成功載入 Excel 調酒資料！", "success");
        } catch (err) {
          showToast(`Excel 解析失敗: ${err.message}`, "error");
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // 3. 純文字或 CSV (.txt, .csv, .json, .md)
    const textReader = new FileReader();
    textReader.onload = (e) => {
      const content = e.target.result;
      rawInput.value = content;
      const parsed = RecipeParser.parseText(content);
      card.loadData(parsed);
      showToast("已解析文字檔案！", "success");
    };
    textReader.readAsText(file);
  }

  // 6. 參數即時修改連動
  portionInput.addEventListener("input", (e) => {
    const p = parseFloat(e.target.value);
    if (!isNaN(p) && p > 0) {
      card.data.portionSize = p;
      card.render();
    }
  });

  priceInput.addEventListener("input", (e) => {
    const pr = parseFloat(e.target.value);
    if (!isNaN(pr) && pr > 0) {
      card.data.sellingPrice = pr;
      card.isManualCostRate = false;
      card.render();
    }
  });

  // 7. 列操作按鈕
  btnAddRow.addEventListener("click", () => {
    card.addIngredientRow();
    showToast("已新增材料列", "info");
  });

  btnRemoveRow.addEventListener("click", () => {
    card.removeLastIngredientRow();
    showToast("已移除最後一列材料", "info");
  });

  // 8. 匯出按鈕事件處理
  btnExportPdf.addEventListener("click", async () => {
    try {
      showToast("正在生成高解析 PDF 規格表...", "info");
      await RecipeExporter.exportPDF(card);
      showToast("PDF 匯出成功！", "success");
    } catch (e) {
      console.error(e);
      showToast("PDF 匯出失敗", "error");
    }
  });

  btnExportExcel.addEventListener("click", async () => {
    try {
      showToast("正在建立 Excel (.xlsx) 試算表...", "info");
      await RecipeExporter.exportExcel(card);
      showToast("Excel 匯出成功！", "success");
    } catch (e) {
      console.error(e);
      showToast("Excel 匯出失敗", "error");
    }
  });

  btnExportWord.addEventListener("click", async () => {
    try {
      showToast("正在匯出 Word (.docx) 文件...", "info");
      await RecipeExporter.exportWord(card);
      showToast("Word 匯出成功！", "success");
    } catch (e) {
      console.error(e);
      showToast("Word 匯出失敗", "error");
    }
  });

  btnExportPng.addEventListener("click", async () => {
    try {
      showToast("正在生成 Retina 高畫質 PNG...", "info");
      await RecipeExporter.exportPNG(card);
      showToast("PNG 圖檔匯出成功！", "success");
    } catch (e) {
      console.error(e);
      showToast("PNG 匯出失敗", "error");
    }
  });

  btnExportJpg.addEventListener("click", async () => {
    try {
      showToast("正在生成 95% 高品質 JPG...", "info");
      await RecipeExporter.exportJPG(card);
      showToast("JPG 圖檔匯出成功！", "success");
    } catch (e) {
      console.error(e);
      showToast("JPG 匯出失敗", "error");
    }
  });

  btnPrint.addEventListener("click", () => {
    window.print();
  });

  // ==========================================
  // 9. 文字粗細體 (Bold/Normal) 與變更顏色核心控制
  // ==========================================
  const floatingToolbar = document.getElementById("floating-format-toolbar");
  const toolbarColorPicker = document.getElementById("toolbar-color-picker");
  const toolbarColorPreview = document.getElementById("toolbar-color-preview");
  const floatingColorPicker = document.getElementById("floating-color-picker");

  // 套用格式通用函式
  function applyTextFormat(cmd, value = null) {
    document.execCommand("styleWithCSS", false, true);
    if (cmd === "color") {
      document.execCommand("foreColor", false, value);
    } else {
      document.execCommand(cmd, false, value);
    }

    // 即時儲存至卡片資料模型
    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode;
      while (node && !node.isContentEditable && node !== document.body) {
        node = node.parentNode;
      }
      if (node && node.isContentEditable) {
        card.handleCellEdit(node);
      }
    }
  }

  // 頂部與懸浮工具列命令按鈕 (mousedown 防止選取範圍丟失)
  document.querySelectorAll("[data-cmd]").forEach(btn => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      applyTextFormat(cmd);
      if (cmd === "bold") showToast("已切換粗體 (Bold)", "info");
      else if (cmd === "italic") showToast("已套用斜體", "info");
      else if (cmd === "underline") showToast("已套用底線", "info");
      else if (cmd === "removeFormat") showToast("已清除文字格式", "info");
    });
  });

  // 顏色圓點點擊直接上色
  document.querySelectorAll(".fmt-color-dot").forEach(dot => {
    dot.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const color = dot.dataset.color;
      applyTextFormat("color", color);
      if (toolbarColorPreview) toolbarColorPreview.style.background = color;
      showToast(`已變更文字顏色: ${color}`, "info");
    });
  });

  // 頂部顏色選取器 (原生調色盤)
  if (toolbarColorPicker) {
    toolbarColorPicker.addEventListener("input", (e) => {
      const color = e.target.value;
      if (toolbarColorPreview) toolbarColorPreview.style.background = color;
      applyTextFormat("color", color);
    });
  }

  // 懸浮顏色選取器 (原生調色盤)
  if (floatingColorPicker) {
    floatingColorPicker.addEventListener("input", (e) => {
      const color = e.target.value;
      applyTextFormat("color", color);
    });
  }

  // 監聽文字選取，自動定位浮動選單 (選取文字即浮現)
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      if (floatingToolbar) floatingToolbar.classList.remove("show");
      return;
    }

    const range = sel.getRangeAt(0);
    const container = document.getElementById("sop-card");
    if (!container || !container.contains(range.commonAncestorContainer)) {
      if (floatingToolbar) floatingToolbar.classList.remove("show");
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && floatingToolbar) {
      const top = Math.max(10, rect.top - 46);
      const left = Math.max(10, rect.left + rect.width / 2 - 140);
      floatingToolbar.style.top = `${top}px`;
      floatingToolbar.style.left = `${left}px`;
      floatingToolbar.classList.add("show");
    }
  });

  // 點擊卡片外部時隱藏浮動選單
  document.addEventListener("mousedown", (e) => {
    if (floatingToolbar && !floatingToolbar.contains(e.target)) {
      const cardElem = document.getElementById("sop-card");
      if (cardElem && !cardElem.contains(e.target)) {
        floatingToolbar.classList.remove("show");
      }
    }
  });
});
