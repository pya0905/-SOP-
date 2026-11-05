// js/parser.js - 萬能資料解析引擎 (純文字 / 表格 / CSV / 檔案 / 本地啟發式 / Gemini AI)

class RecipeParser {
  /**
   * 本地智能規則與語意啟發式解析器 (離線運作，毫秒級響應)
   * @param {string} text 任意形式的文字、筆記、複製表格等
   * @returns {Object} 結構化調酒 SOP 物件
   */
  static parseText(text) {
    if (!text || !text.trim()) {
      return JSON.parse(JSON.stringify(COCKTAIL_PRESETS.jasmineMelon));
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    let name = "";
    let cupMethodLines = [];
    let garnish = "";
    let portionSize = 80;
    let sellingPrice = 400;
    let costRate = "";
    let ingredients = [];
    let batchMethodLines = [];

    let currentSection = ""; // "cup", "garnish", "ingredients", "batch"

    // 正則輔助
    const nameRegex = /^(?:酒名|名稱|品名|Cocktail|Name|Drink)[:：\s]*(.+)$/i;
    const garnishRegex = /^(?:裝飾|裝飾物|Garnish)[:：\s]*(.+)$/i;
    const cupMethodHeaderRegex = /^(?:【出杯(?:作法|步驟|SOP)?】|出杯(?:作法|步驟|SOP)[:：]?|作法[:：]?$)/i;
    const batchHeaderRegex = /^(?:【(?:批次|預製|預調|自製|材料預製|製程)?(?:作法|SOP)?】|批次作法[:：]?|預製作法[:：]?|自製配方[:：]?|------)/i;
    const portionRegex = /(?:每份|單杯|份量|容量)[:：\s]*(\d+)\s*(?:ml|毫升|cc)?/i;
    const priceRegex = /(?:售價|單杯售價|定價)[:：\s]*(\d+)/i;
    const costRateRegex = /(?:成本率|目標成本率)[:：\s]*([\d\.]+%?)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 1. 偵測酒名
      if (!name) {
        const nameMatch = line.match(nameRegex);
        if (nameMatch) {
          name = nameMatch[1].trim();
          continue;
        } else if (line.match(/^No\d+[\.\s]/i) || (i === 0 && !line.includes(":") && !line.includes("：") && !line.includes(",") && !line.includes("\t") && line.length < 50)) {
          name = line;
          continue;
        }
      }

      // 2. 偵測裝飾
      const garnishMatch = line.match(garnishRegex);
      if (garnishMatch) {
        garnish = garnishMatch[1].trim();
        continue;
      }

      // 3. 偵測每份容量 / 售價 / 成本率
      const pMatch = line.match(portionRegex);
      if (pMatch) portionSize = parseFloat(pMatch[1]);

      const prMatch = line.match(priceRegex);
      if (prMatch) sellingPrice = parseFloat(prMatch[1]);

      const crMatch = line.match(costRateRegex);
      if (crMatch) costRate = crMatch[1].includes("%") ? crMatch[1] : `${crMatch[1]}%`;

      // 4. 偵測區塊切換
      if (cupMethodHeaderRegex.test(line)) {
        currentSection = "cup";
        continue;
      } else if (batchHeaderRegex.test(line) || line.startsWith("【") && !line.includes("出杯")) {
        currentSection = "batch";
        batchMethodLines.push(line);
        continue;
      } else if (/^(?:【材料】|材料清單|配方|配方清單)[:：]?$/i.test(line)) {
        currentSection = "ingredients";
        continue;
      }

      // 5. 判斷材料行 (包含數字與容量單位、或者 tab 分隔、逗號分隔)
      const isTableSeparator = /^[-|\s]{3,}$/.test(line) || /^(?:材料|總容量|酒精濃度|單價|單位|小計)/.test(line);
      if (isTableSeparator) {
        currentSection = "ingredients";
        continue;
      }

      // 嘗試解析為材料列
      const parsedIng = RecipeParser.parseIngredientLine(line);
      if (parsedIng && currentSection !== "batch" && currentSection !== "cup") {
        ingredients.push(parsedIng);
        continue;
      }

      // 6. 依當前區塊收集內容
      if (currentSection === "cup") {
        if (/^\d+\.|\d+、/.test(line) || line.includes("大冰") || line.includes("倒入") || line.includes("噴") || line.includes("杯")) {
          cupMethodLines.push(line);
        } else if (line.includes("綠豆蔻") || line.includes("果乾") || line.includes("皮") || line.includes("花")) {
          if (!garnish) garnish = line;
          else cupMethodLines.push(line);
        } else {
          cupMethodLines.push(line);
        }
      } else if (currentSection === "batch") {
        batchMethodLines.push(line);
      } else {
        // 未明確區塊時的啟發式推測
        if (/^\d+\.|\d+、/.test(line)) {
          // 包含過濾、舒肥、冷泡、煮、攪拌機通常是批次作法
          if (line.includes("攪拌機") || line.includes("鮮奶") || line.includes("過濾") || line.includes("舒肥") || line.includes("澄清") || line.includes("煮")) {
            currentSection = "batch";
            batchMethodLines.push(line);
          } else {
            cupMethodLines.push(line);
          }
        } else if (line.startsWith("【") || line.includes("舒肥") || line.includes("冷泡") || line.includes("糖漿") || line.includes("茶湯")) {
          currentSection = "batch";
          batchMethodLines.push(line);
        }
      }
    }

    // 若無材料，嘗試從內文中抽取可能項目
    if (ingredients.length === 0) {
      ingredients = JSON.parse(JSON.stringify(COCKTAIL_PRESETS.jasmineMelon.ingredients));
    }

    // 補齊預設值
    if (!name) name = "Custom Cocktail (自訂調酒)";
    if (cupMethodLines.length === 0) {
      cupMethodLines = ["1.杯子放正方大冰", "2.倒入80毫升酒體", "3.放上裝飾噴香氛出杯"];
    }
    if (!garnish) garnish = "精緻裝飾物";
    if (batchMethodLines.length === 0) {
      batchMethodLines = [
        "1.將所有調和材料混合均勻。",
        "2.冷藏過濾後靜置備用。"
      ];
    }

    return {
      name,
      photo: DEFAULT_COCKTAIL_IMAGE,
      cupMethod: cupMethodLines.join("\n"),
      garnish,
      portionSize: portionSize || 80,
      sellingPrice: sellingPrice || 400,
      costRate: costRate || "",
      ingredients,
      batchMethod: batchMethodLines.join("\n")
    };
  }

  /**
   * 解析單行材料文字 (支援 tab、逗號、空白、或包含單位數字)
   * 範例:
   * "鍛高譚混合液\t300\t20\t0.94\t克\t282"
   * "鍛高譚混合液, 300, 20, 0.94, 克, 282"
   * "冷萃茉莉茶 300ml 0.04元 毫升"
   */
  static parseIngredientLine(line) {
    if (!line || line.startsWith("【") || line.startsWith("#") || line.length < 2) return null;

    // 1. Tab 分隔 (Excel 直接複製貼上)
    if (line.includes("\t")) {
      const parts = line.split("\t").map(p => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const volume = parseFloat(parts[1]) || 0;
        const abv = parts[2] ? parseFloat(parts[2]) : null;
        const unitPrice = parts[3] ? parseFloat(parts[3]) : null;
        const unit = parts[4] || (name.includes("粉") || name.includes("糖") || name.includes("瓜") ? "克" : "毫升");
        const subtotal = parts[5] ? parseFloat(parts[5]) : (volume && unitPrice ? Math.round(volume * unitPrice * 100) / 100 : 0);
        return { name, volume, abv, unitPrice, unit, subtotal };
      }
    }

    // 2. 逗號分隔 (CSV)
    if (line.includes(",")) {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 2 && !isNaN(parseFloat(parts[1]))) {
        const name = parts[0];
        const volume = parseFloat(parts[1]) || 0;
        const abv = parts[2] ? parseFloat(parts[2]) : null;
        const unitPrice = parts[3] ? parseFloat(parts[3]) : null;
        const unit = parts[4] || "毫升";
        const subtotal = parts[5] ? parseFloat(parts[5]) : (volume && unitPrice ? Math.round(volume * unitPrice * 100) / 100 : 0);
        return { name, volume, abv, unitPrice, unit, subtotal };
      }
    }

    // 3. 自然語言 / 空白分隔萃取
    // 範例: "鍛高譚混合液 300 20 0.94 克 282" 或 "哈密瓜 300g 單價 0.125"
    const tokens = line.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length >= 2) {
      const name = tokens[0];
      let volume = null;
      let abv = null;
      let unitPrice = null;
      let unit = "毫升";
      let subtotal = null;

      // 檢查剩餘 token
      const nums = [];
      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.includes("%") || /abv/i.test(token)) {
          abv = parseFloat(token);
        } else if (token === "克" || token.toLowerCase() === "g") {
          unit = "克";
        } else if (token === "毫升" || token.toLowerCase() === "ml") {
          unit = "毫升";
        } else {
          const val = parseFloat(token);
          if (!isNaN(val)) nums.push(val);
        }
      }

      if (nums.length >= 1) {
        volume = nums[0];
        if (nums.length >= 2 && abv === null && nums[1] <= 100 && nums.length >= 3) {
          abv = nums[1];
          unitPrice = nums[2];
          subtotal = nums[3] || Math.round(volume * unitPrice * 100) / 100;
        } else if (nums.length >= 2) {
          unitPrice = nums[1];
          subtotal = nums[2] || Math.round(volume * unitPrice * 100) / 100;
        } else {
          subtotal = 0;
        }

        return {
          name,
          volume: volume || 0,
          abv: abv || null,
          unitPrice: unitPrice || 0,
          unit,
          subtotal: subtotal || (volume && unitPrice ? Math.round(volume * unitPrice * 100) / 100 : 0)
        };
      }
    }

    return null;
  }

  /**
   * 使用 XLSX 函式庫解析上傳的 Excel 檔案
   * @param {ArrayBuffer} buffer 檔案二進位資料
   * @returns {Object} 調酒 SOP 結構
   */
  static parseExcel(buffer) {
    if (!window.XLSX) {
      throw new Error("XLSX 函式庫尚未載入");
    }
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let textContent = "";
    rawRows.forEach(row => {
      if (Array.isArray(row) && row.length > 0) {
        textContent += row.join("\t") + "\n";
      }
    });

    return RecipeParser.parseText(textContent);
  }

  /**
   * Gemini API 深度智能結構化解析 (使用 Google 官方 Gemini Flash 模型)
   * @param {string} rawInput 任意文字或筆記
   * @param {string} apiKey 使用者提供的 Gemini API Key
   * @returns {Promise<Object>} 結構化調酒 SOP 物件
   */
  static async parseWithGemini(rawInput, apiKey) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error("請先輸入有效的 Gemini API Key");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

    const systemPrompt = `你是一個世界頂尖的專業調酒研發師與酒吧 SOP 標準化專家。
使用者的輸入可能是極端凌亂的調酒配方、酒吧群組文字、廚房筆記、語音轉文字、或非結構化資料。
請嚴格依據下列 JSON Schema 解析並輸出 JSON：
{
  "name": "調酒名稱 (如: No3. Jasmine melon)",
  "cupMethod": "出杯作法，多步驟以 \\n 分隔 (如: 1.杯子放正方大冰\\n2.倒入80毫升酒體\\n3.放上一粒綠豆蔻後噴2下茉莉花水)",
  "garnish": "裝飾物說明 (如: 一粒綠豆蔻)",
  "portionSize": 80, // 每份單杯容量(ml)，預設 80
  "sellingPrice": 400, // 單杯建議售價(元)，預設 400
  "costRate": "6.50%", // 成本率字串
  "ingredients": [
    {
      "name": "材料名稱 (如: 鍛高譚混合液)",
      "volume": 300, // 總容量
      "abv": 20, // 酒精濃度(數字，無酒精填 null)
      "unitPrice": 0.94, // 單價(元)
      "unit": "克", // 單位 ("克" 或 "毫升")
      "subtotal": 282 // 小計
    }
  ],
  "batchMethod": "詳細批次預製與自製材料作法，包含舒肥、冷泡、糖漿煮法等。可包含 【材料名稱】 小標題與條列步驟。"
}
務必只回傳純 JSON，不要附加 markdown 代碼塊標記。`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\n使用者輸入資料如下：\n${rawInput}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Gemini API 請求失敗 (狀態碼: ${response.status})`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Gemini 未回傳有效解析結果");
    }

    let parsed = JSON.parse(candidateText.trim());
    if (!parsed.photo) parsed.photo = DEFAULT_COCKTAIL_IMAGE;
    return parsed;
  }
}
