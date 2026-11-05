// js/exporter.js - 多格式輸出核心 (PDF, EXCEL, WORD, PNG, JPG)

class RecipeExporter {
  /**
   * 輔助函式：觸發瀏覽器下載 Blob
   */
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  /**
   * 清理檔名特殊字元
   */
  static sanitizeFilename(name) {
    return (name || "Cocktail_SOP").replace(/[\\/:*?"<>|]/g, "_").trim();
  }

  /**
   * 1. 匯出 PNG (高解析度 3x Retina)
   */
  static async exportPNG(cardInstance) {
    const cardElem = document.getElementById("sop-card");
    if (!cardElem) return;

    const baseName = RecipeExporter.sanitizeFilename(cardInstance.data.name);
    cardElem.classList.add("is-exporting");

    try {
      const canvas = await html2canvas(cardElem, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      canvas.toBlob(blob => {
        RecipeExporter.downloadBlob(blob, `${baseName}_SOP流程圖.png`);
      }, "image/png");
    } finally {
      cardElem.classList.remove("is-exporting");
    }
  }

  /**
   * 2. 匯出 JPG (高品質 95%)
   */
  static async exportJPG(cardInstance) {
    const cardElem = document.getElementById("sop-card");
    if (!cardElem) return;

    const baseName = RecipeExporter.sanitizeFilename(cardInstance.data.name);
    cardElem.classList.add("is-exporting");

    try {
      const canvas = await html2canvas(cardElem, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      canvas.toBlob(blob => {
        RecipeExporter.downloadBlob(blob, `${baseName}_SOP流程圖.jpg`);
      }, "image/jpeg", 0.95);
    } finally {
      cardElem.classList.remove("is-exporting");
    }
  }

  /**
   * 3. 匯出 PDF (A4 橫式標準規格)
   */
  static async exportPDF(cardInstance) {
    const cardElem = document.getElementById("sop-card");
    if (!cardElem) return;

    const baseName = RecipeExporter.sanitizeFilename(cardInstance.data.name);
    cardElem.classList.add("is-exporting");

    try {
      const canvas = await html2canvas(cardElem, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);

      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, "JPEG", x, y, finalWidth, finalHeight);
      pdf.save(`${baseName}_SOP流程圖.pdf`);
    } finally {
      cardElem.classList.remove("is-exporting");
    }
  }

  /**
   * 4. 匯出 EXCEL (.xlsx - 嚴格按照圖片中結構、儲存格合併、灰底填充與公式)
   */
  static async exportExcel(cardInstance) {
    if (!window.ExcelJS) {
      alert("ExcelJS 模組尚未準備就緒，請稍候重試");
      return;
    }

    const data = cardInstance.data;
    const totals = cardInstance.calculateTotals();
    const baseName = RecipeExporter.sanitizeFilename(data.name);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Cocktail SOP Studio";
    workbook.lastModifiedBy = "Cocktail SOP Studio";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("SOP規格表", {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

    // 欄寬定義 (對齊原圖比例)
    ws.columns = [
      { key: "colA", width: 14 }, // 左側標籤欄 (成本率)
      { key: "colB", width: 18 }, // 左側數值欄 (6.50% / 酒名照片)
      { key: "colC", width: 24 }, // 材料 / 總計 / 每份容量 / 單杯成本
      { key: "colD", width: 14 }, // 總容量(ml)
      { key: "colE", width: 16 }, // 酒精濃度(abv)
      { key: "colF", width: 12 }, // 單價
      { key: "colG", width: 10 }, // 單位
      { key: "colH", width: 14 }, // 小計
      { key: "colI", width: 48 }  // 作法
    ];

    const thinBorder = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC8CBCE" }
    };

    // Row 1: 表頭
    const headerRow = ws.getRow(1);
    headerRow.values = [
      "酒名", "", "材料", "總容量(ml)", "酒精濃度(abv)", "單價", "單位", "小計", "作法"
    ];
    ws.mergeCells("A1:B1");

    for (let c = 1; c <= 9; c++) {
      const cell = headerRow.getCell(c);
      cell.fill = headerFill;
      cell.font = { name: "微軟正黑體", size: 11, bold: true, color: { argb: "FF000000" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    }

    const ings = data.ingredients;
    const N = Math.max(ings.length, 7);

    // 填入材料列與基本邊框 (Rows 2 到 N+1)
    for (let i = 0; i < N; i++) {
      const r = i + 2;
      const ing = ings[i] || { name: "", volume: "", abv: "", unitPrice: "", unit: "", subtotal: "" };
      const row = ws.getRow(r);

      row.getCell(3).value = ing.name || "";
      row.getCell(4).value = ing.volume !== "" && ing.volume !== null ? parseFloat(ing.volume) : "";
      row.getCell(5).value = ing.abv !== "" && ing.abv !== null ? parseFloat(ing.abv) : "";
      row.getCell(6).value = ing.unitPrice !== "" && ing.unitPrice !== null ? parseFloat(ing.unitPrice) : "";
      row.getCell(7).value = ing.unit || "";
      row.getCell(8).value = ing.subtotal !== "" && ing.subtotal !== null ? parseFloat(ing.subtotal) : "";

      // 對齊與邊框
      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = { name: "微軟正黑體", size: 10 };
        if (c === 3) cell.alignment = { vertical: "middle", horizontal: "left" };
        else if (c >= 4 && c <= 8) cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    }

    // 左側合併區塊配置 (嚴格 1:1 對齊)
    // A2:B5 -> 酒名 + 照片
    ws.mergeCells("A2:B5");
    const cellName = ws.getCell("A2");
    cellName.value = data.name;
    cellName.font = { name: "微軟正黑體", size: 12, bold: true };
    cellName.alignment = { vertical: "top", horizontal: "center", wrapText: true };

    // 嘗試在 A3:B5 區域插入照片
    if (data.photo && data.photo.startsWith("data:image/")) {
      try {
        const base64Data = data.photo.split(",")[1];
        const imageId = workbook.addImage({
          base64: base64Data,
          extension: "jpeg"
        });
        ws.addImage(imageId, {
          tl: { col: 0.3, row: 2.2 },
          ext: { width: 90, height: 90 }
        });
      } catch (e) {
        console.warn("Excel 圖片嵌入失敗:", e);
      }
    }

    // A6:B6 -> 出杯標題「作法」(灰底)
    ws.mergeCells("A6:B6");
    const cellCupHdr = ws.getCell("A6");
    cellCupHdr.value = "作法";
    cellCupHdr.fill = headerFill;
    cellCupHdr.font = { name: "微軟正黑體", size: 11, bold: true };
    cellCupHdr.alignment = { vertical: "middle", horizontal: "center" };

    // A7:B8 -> 出杯步驟內容
    ws.mergeCells("A7:B8");
    const cellCup = ws.getCell("A7");
    cellCup.value = data.cupMethod;
    cellCup.font = { name: "微軟正黑體", size: 9 };
    cellCup.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    const sumRow1 = N + 2; // 總計列
    const sumRow2 = N + 3; // 每份容量列
    const sumRow3 = N + 4; // 單杯成本列 (高底部)

    // A9:B9 -> 裝飾標題「裝飾」(灰底，與總計同列！)
    ws.mergeCells(`A${sumRow1}:B${sumRow1}`);
    const cellGarHdr = ws.getCell(`A${sumRow1}`);
    cellGarHdr.value = "裝飾";
    cellGarHdr.fill = headerFill;
    cellGarHdr.font = { name: "微軟正黑體", size: 11, bold: true };
    cellGarHdr.alignment = { vertical: "middle", horizontal: "center" };

    // A10:B10 -> 裝飾內容「一粒綠豆蔻」(與每份容量/總份數同列！)
    ws.mergeCells(`A${sumRow2}:B${sumRow2}`);
    const cellGar = ws.getCell(`A${sumRow2}`);
    cellGar.value = data.garnish;
    cellGar.font = { name: "微軟正黑體", size: 10 };
    cellGar.alignment = { vertical: "middle", horizontal: "center" };

    // 總結列 1: 總計
    const r1 = ws.getRow(sumRow1);
    r1.getCell(3).value = "總計";
    r1.getCell(3).fill = headerFill;
    r1.getCell(4).value = totals.totalVolume;
    r1.getCell(5).value = totals.weightedABV;
    r1.getCell(6).value = totals.sumPrice || "";
    r1.getCell(7).value = totals.sumUnit || "";
    r1.getCell(8).value = totals.totalCost;

    // 總結列 2: 每份容量 / 總份數
    const r2 = ws.getRow(sumRow2);
    r2.getCell(3).value = "每份容量/總份數";
    r2.getCell(3).fill = headerFill;
    r2.getCell(4).value = data.portionSize;
    r2.getCell(5).value = totals.portionAbv || "";
    r2.getCell(6).value = totals.portionPrice || "";
    r2.getCell(7).value = totals.portionUnit || "";
    r2.getCell(8).value = totals.servingsCount;

    // 總結列 3: 單杯成本 (底部高跨距列)
    const r3 = ws.getRow(sumRow3);
    r3.height = 140; // 底部加大高度對齊作法
    r3.getCell(1).value = "成本率";
    r3.getCell(2).value = totals.displayCostRate;
    r3.getCell(3).value = "單杯成本";
    r3.getCell(3).fill = headerFill;
    r3.getCell(4).value = totals.bottomVolume || "";
    r3.getCell(5).value = totals.bottomAbv || "";
    r3.getCell(6).value = totals.bottomPrice || "";
    r3.getCell(7).value = totals.bottomUnit || "";
    r3.getCell(8).value = totals.cupCost;

    // 樣式化總結列標題與框線
    [sumRow1, sumRow2, sumRow3].forEach(rowNum => {
      const row = ws.getRow(rowNum);
      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        if (c === 3) {
          cell.font = { name: "微軟正黑體", size: 10, bold: true };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (c >= 4 && c <= 8) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.font = { name: "微軟正黑體", size: 10, bold: true };
        } else if (c === 1 || c === 2) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.font = { name: "微軟正黑體", size: 10, bold: true };
        }
      }
    });

    // 右側作法長條區塊 (跨 Row 2 到 sumRow3)
    ws.mergeCells(`I2:I${sumRow3}`);
    const cellBatch = ws.getCell("I2");
    cellBatch.value = data.batchMethod;
    cellBatch.font = { name: "微軟正黑體", size: 9 };
    cellBatch.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    // 寫入並下載 Excel 檔案
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    RecipeExporter.downloadBlob(blob, `${baseName}_SOP流程圖.xlsx`);
  }

  /**
   * 5. 匯出 WORD (.docx - 100% 格式完整還原表格規格)
   */
  static async exportWord(cardInstance) {
    const data = cardInstance.data;
    const totals = cardInstance.calculateTotals();
    const baseName = RecipeExporter.sanitizeFilename(data.name);

    if (window.docx) {
      try {
        const { Document, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, AlignmentType, PageOrientation, ShadingType } = window.docx;

        const borderStyle = {
          style: BorderStyle.SINGLE,
          size: 4,
          color: "000000"
        };
        const cellBorders = {
          top: borderStyle,
          bottom: borderStyle,
          left: borderStyle,
          right: borderStyle
        };

        const headerShading = {
          fill: "C8CBCE",
          type: ShadingType.CLEAR
        };

        const tableRows = [];

        // Header Row
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 2,
                shading: headerShading,
                borders: cellBorders,
                children: [new Paragraph({ text: "酒名", alignment: AlignmentType.CENTER, style: "bold" })]
              }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "材料", alignment: AlignmentType.CENTER })] }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "總容量(ml)", alignment: AlignmentType.CENTER })] }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "酒精濃度(abv)", alignment: AlignmentType.CENTER })] }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "單價", alignment: AlignmentType.CENTER })] }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "單位", alignment: AlignmentType.CENTER })] }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "小計", alignment: AlignmentType.CENTER })] }),
              new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "作法", alignment: AlignmentType.CENTER })] })
            ]
          })
        );

        // 主體內容列
        const ings = data.ingredients;
        const N = ings.length;

        ings.forEach((ing, idx) => {
          const cells = [];
          
          if (idx === 0) {
            cells.push(new TableCell({
              columnSpan: 2,
              rowSpan: 4,
              borders: cellBorders,
              children: [
                new Paragraph({ text: data.name, alignment: AlignmentType.CENTER, style: "bold" })
              ]
            }));
          } else if (idx === 4) {
            cells.push(new TableCell({
              columnSpan: 2,
              shading: headerShading,
              borders: cellBorders,
              children: [new Paragraph({ text: "作法", alignment: AlignmentType.CENTER })]
            }));
          } else if (idx === 5) {
            cells.push(new TableCell({
              columnSpan: 2,
              rowSpan: 2,
              borders: cellBorders,
              children: data.cupMethod.split("\n").map(l => new Paragraph(l))
            }));
          }

          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph(ing.name || "")] }));
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph(String(ing.volume ?? ""))] }));
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph(String(ing.abv ?? ""))] }));
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph(String(ing.unitPrice ?? ""))] }));
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph(ing.unit || "")] }));
          cells.push(new TableCell({ borders: cellBorders, children: [new Paragraph(String(ing.subtotal ?? ""))] }));

          if (idx === 0) {
            cells.push(new TableCell({
              rowSpan: N + 3,
              borders: cellBorders,
              children: data.batchMethod.split("\n").map(line => new Paragraph(line))
            }));
          }

          tableRows.push(new TableRow({ children: cells }));
        });

        // 總計列 (左側: 裝飾 灰底標題)
        tableRows.push(new TableRow({
          children: [
            new TableCell({ columnSpan: 2, shading: headerShading, borders: cellBorders, children: [new Paragraph({ text: "裝飾", alignment: AlignmentType.CENTER })] }),
            new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph("總計")] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.totalVolume))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.weightedABV))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.sumPrice || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.sumUnit || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.totalCost))] })
          ]
        }));

        // 每份容量列 (左側: 裝飾內容 一粒綠豆蔻)
        tableRows.push(new TableRow({
          children: [
            new TableCell({ columnSpan: 2, borders: cellBorders, children: [new Paragraph({ text: data.garnish, alignment: AlignmentType.CENTER })] }),
            new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph("每份容量/總份數")] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(data.portionSize))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.portionAbv || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.portionPrice || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.portionUnit || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.servingsCount))] })
          ]
        }));

        // 單杯成本列 (底部: 成本率 | 6.50% | 單杯成本 | 26)
        tableRows.push(new TableRow({
          children: [
            new TableCell({ borders: cellBorders, children: [new Paragraph("成本率")] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(totals.displayCostRate)] }),
            new TableCell({ shading: headerShading, borders: cellBorders, children: [new Paragraph("單杯成本")] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.bottomVolume || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.bottomAbv || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.bottomPrice || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.bottomUnit || ""))] }),
            new TableCell({ borders: cellBorders, children: [new Paragraph(String(totals.cupCost))] })
          ]
        }));

        const doc = new Document({
          sections: [{
            properties: {
              page: {
                size: {
                  orientation: PageOrientation.LANDSCAPE
                }
              }
            },
            children: [
              new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
              })
            ]
          }]
        });

        const blob = await window.docx.Packer.toBlob(doc);
        RecipeExporter.downloadBlob(blob, `${baseName}_SOP流程圖.docx`);
        return;
      } catch (e) {
        console.warn("docx.js 產生失敗，轉用 HTML MIME-Word 格式相容輸出:", e);
      }
    }

    // HTML MIME-Word 萬用備援方案
    const cardElem = document.getElementById("sop-card");
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          @page Section1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 20pt 20pt 20pt 20pt; }
          div.Section1 { page: Section1; }
          table { border-collapse: collapse; width: 100%; font-family: "Microsoft JhengHei", Arial, sans-serif; font-size: 10pt; }
          th, td { border: 1px solid black; padding: 4px 6px; }
          .sop-header-row th, .td-section-header, .td-summary-title, .td-single-cup-cost-title { background-color: #c8cbce; font-weight: bold; text-align: center; }
          .cocktail-img { width: 80px; height: 80px; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${cardElem.innerHTML}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/msword" });
    RecipeExporter.downloadBlob(blob, `${baseName}_SOP流程圖.doc`);
  }
}
