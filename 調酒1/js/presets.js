// js/presets.js - 調酒 SOP 預設範本資料庫

// 原圖調酒照片 (Base64)
const DEFAULT_COCKTAIL_IMAGE = "data:image/jpeg;base64,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";

// 預設資料庫
const COCKTAIL_PRESETS = {
  // 原圖 100% 相同範例
  jasmineMelon: {
    name: "No3. Jasmine melon",
    photo: DEFAULT_COCKTAIL_IMAGE,
    cupMethod: "1.杯子放正方大冰\n2.倒入80毫升酒體\n3.放上一粒綠豆蔻後噴2下茉莉花水",
    garnish: "一粒綠豆蔻",
    portionSize: 80,
    sellingPrice: 400,
    costRate: "6.50%",
    ingredients: [
      { name: "鍛高譚混合液", volume: 300, abv: 20, unitPrice: 0.94, unit: "克", subtotal: 282 },
      { name: "冷萃茉莉茶", volume: 300, abv: null, unitPrice: 0.04, unit: "毫升", subtotal: 12 },
      { name: "哈密瓜", volume: 300, abv: null, unitPrice: 0.125, unit: "克", subtotal: 37.5 },
      { name: "自製酸葡萄汁", volume: 300, abv: 11.8, unitPrice: 0.47, unit: "毫升", subtotal: 141.00 },
      { name: "茉莉糖漿", volume: 150, abv: null, unitPrice: 0.08, unit: "克", subtotal: 12 },
      { name: "牛奶", volume: 300, abv: null, unitPrice: 0.075, unit: "毫升", subtotal: 23 },
      { name: "Gordon premixes", volume: 220, abv: 34.5, unitPrice: 0.46, unit: "毫升", subtotal: 101.2 }
    ],
    batchMethod: `1.將所有材料(除牛奶跟gordon premix)加入後用攪拌機打碎
2.倒入鮮奶中，攪拌均勻後，靜置約1分鐘後，即可用百合壺過濾
 *不可以顛倒為鮮奶倒入酒體*
3.以咖啡濾紙過濾得到澄清的酒體本身
4.最後加入gordon premixes攪拌均勻
------
【鍛高譚混合液】
鍛高譚300g
綠豆蔻3g
加入上述材料後舒肥(58度3小時)
【冷萃茉莉茶】
冷水 300ml
茉莉茶葉15g
以上冷泡5.5小時後過濾茶葉裝瓶備用
【自製酸葡萄汁】
巨峰紫75ml
House white wine 150ml
Cinzano 1757 50ml
蘋果酸液 25ml
【茉莉糖漿】
1.750(水)：25(茉莉茶葉)比例水煮茶葉，煮至冒泡後立即過濾
2.以1(茶湯)：1.25(白砂糖)比例煮到糖完全溶解
3.過濾後放涼裝瓶或真空500/袋
【gordon premixes】
高登100ml
生命之水40ml
自製糖漿50ml
蘋果酸液30ml`
  },

  // 澄清紐約酸 (Clarified New York Sour)
  nySour: {
    name: "Clarified NY Sour (澄清紐約酸)",
    photo: DEFAULT_COCKTAIL_IMAGE,
    cupMethod: "1.洛克杯放入手工老冰塊一枚\n2.量取85ml澄清酒體注入杯中\n3.吧叉匙引流輕漂浮紅酒8ml\n4.杯壁夾上一片脫水紅酒橙乾裝飾",
    garnish: "紅酒浮層 (8ml) + 脫水橙乾",
    portionSize: 85,
    sellingPrice: 420,
    costRate: "7.80%",
    ingredients: [
      { name: "波旁威士忌 (Bulleit Bourbon)", volume: 500, abv: 45, unitPrice: 0.85, unit: "毫升", subtotal: 425 },
      { name: "鮮榨檸檬汁", volume: 250, abv: null, unitPrice: 0.15, unit: "毫升", subtotal: 37.5 },
      { name: "自製白砂糖漿 (2:1)", volume: 200, abv: null, unitPrice: 0.05, unit: "毫升", subtotal: 10 },
      { name: "全脂鮮牛奶 (洗清用)", volume: 200, abv: null, unitPrice: 0.08, unit: "毫升", subtotal: 16 },
      { name: "紅酒 (Float用)", volume: 80, abv: 13.5, unitPrice: 0.40, unit: "毫升", subtotal: 32 }
    ],
    batchMethod: `1.將威士忌、鮮檸檬汁、糖漿充分調勻成酸甜酸底。
2.緩緩注入常溫鮮奶中，觀察蛋白質受酸凝乳化，靜置約15分鐘。
3.倒入百合壺與雙層咖啡濾紙過濾，初期濾液若稍濁請重複回倒濾紙直至清澈透亮。
4.澄清液體冷藏密封保存，風味可穩定保持一個月。
------
【自製白砂糖漿 (2:1)】
白砂糖 400g
純淨水 200ml
低溫慢煮至完全融化澄澈，冷卻裝瓶。`
  },

  // 碳焙烏龍 Old Fashioned
  oolongOF: {
    name: "Smoked Oolong Old Fashioned",
    photo: DEFAULT_COCKTAIL_IMAGE,
    cupMethod: "1.古典杯放入大圓冰球一枚\n2.量取75ml浸漬酒體倒入杯中\n3.使用吧匙順時針攪拌調和20秒\n4.以噴火槍輕炙烏龍茶葉與肉桂棒釋放香氣",
    garnish: "炙燒肉桂棒 + 烘焙烏龍茶乾葉",
    portionSize: 75,
    sellingPrice: 450,
    costRate: "8.20%",
    ingredients: [
      { name: "碳焙鹿谷烏龍浸漬黑麥威士忌", volume: 600, abv: 45, unitPrice: 1.10, unit: "毫升", subtotal: 660 },
      { name: "自製黑糖烏龍茶糖漿", volume: 150, abv: null, unitPrice: 0.10, unit: "毫升", subtotal: 15 },
      { name: "安格仕芳香苦精 (Angostura)", volume: 15, abv: 44.7, unitPrice: 2.20, unit: "毫升", subtotal: 33 },
      { name: "柑橘苦精 (Orange Bitters)", volume: 10, abv: 28, unitPrice: 2.50, unit: "毫升", subtotal: 25 }
    ],
    batchMethod: `1.將所有調和材料依序倒入調和容器中充分輕攪混合。
2.批次裝入深色玻璃瓶密封冷藏於4度低溫熟成24小時出杯。
------
【碳焙烏龍浸漬黑麥威士忌】
黑麥威士忌 700ml
鹿谷凍頂重焙烏龍茶葉 35g
以低溫舒肥袋抽真空，置入52度恆溫水浴槽中慢浸舒肥2.5小時，出槽後冰鎮並以棉濾袋濾除茶渣。
【自製黑糖烏龍茶糖漿】
重焙烏龍茶湯 300ml (高溫快泡)
純台灣黑糖 300g
慢火攪拌溶解，不過度沸騰以保留焦糖與炭香。`
  },

  // 空白結構化範本
  blank: {
    name: "新調酒名稱 (New Cocktail)",
    photo: DEFAULT_COCKTAIL_IMAGE,
    cupMethod: "1.杯中放入冰塊\n2.量取80ml酒體倒入\n3.裝飾完成出杯",
    garnish: "新鮮果乾或香草",
    portionSize: 80,
    sellingPrice: 400,
    costRate: "8.00%",
    ingredients: [
      { name: "基酒", volume: 300, abv: 40, unitPrice: 0.80, unit: "毫升", subtotal: 240 },
      { name: "自製風味液", volume: 200, abv: 15, unitPrice: 0.40, unit: "毫升", subtotal: 80 },
      { name: "果汁 / 茶湯", volume: 300, abv: null, unitPrice: 0.10, unit: "毫升", subtotal: 30 },
      { name: "風味糖漿", volume: 100, abv: null, unitPrice: 0.08, unit: "克", subtotal: 8 }
    ],
    batchMethod: `1.將所有材料依序混合均勻。
2.過濾裝瓶冷藏備用。
------
【自製風味液】
材料與製程步驟說明...`
  }
};
