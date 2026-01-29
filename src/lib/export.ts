"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

// Export to CSV
export function exportToCSV(data: ExportData, filename: string = "export") {
  const csvContent = [
    data.headers.join(","),
    ...data.rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${filename}.csv`);
}

// Export to Excel
export function exportToExcel(data: ExportData, filename: string = "export") {
  const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, data.title || "Sheet1");
  
  // Auto-size columns
  const colWidths = data.headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...data.rows.map(row => String(row[i]).length)
    );
    return { wch: maxLength + 2 };
  });
  worksheet["!cols"] = colWidths;
  
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${filename}.xlsx`);
}

// Export to PDF
export function exportToPDF(data: ExportData, filename: string = "export") {
  const doc = new jsPDF();
  
  // Add title
  if (data.title) {
    doc.setFontSize(18);
    doc.text(data.title, 14, 22);
  }
  
  // Add timestamp
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, data.title ? 30 : 14);
  
  // Add table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: data.title ? 35 : 20,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });
  
  doc.save(`${filename}.pdf`);
}

// Generate PDF Report with charts and metrics
export function generateReport(
  title: string,
  metrics: { label: string; value: string | number }[],
  tableData?: ExportData,
  filename: string = "report"
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, 220, 40, "F");
  
  doc.setTextColor(255);
  doc.setFontSize(24);
  doc.text(title, 14, 25);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
  
  // Reset text color
  doc.setTextColor(0);
  
  // Metrics Section
  doc.setFontSize(14);
  doc.text("Key Metrics", 14, 55);
  
  let yPos = 65;
  const metricsPerRow = 3;
  const metricWidth = 60;
  
  metrics.forEach((metric, index) => {
    const xPos = 14 + (index % metricsPerRow) * metricWidth;
    if (index > 0 && index % metricsPerRow === 0) {
      yPos += 25;
    }
    
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(xPos, yPos - 8, 55, 22, 3, 3, "F");
    
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(String(metric.value), xPos + 5, yPos + 2);
    
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(metric.label, xPos + 5, yPos + 10);
  });
  
  // Table Section
  if (tableData) {
    yPos += 40;
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text(tableData.title || "Details", 14, yPos);
    
    autoTable(doc, {
      head: [tableData.headers],
      body: tableData.rows,
      startY: yPos + 5,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount} | GitHub Learning ROI Dashboard`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  doc.save(`${filename}.pdf`);
}
