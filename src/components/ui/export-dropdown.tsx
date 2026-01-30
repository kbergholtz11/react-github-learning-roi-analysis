"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, FileImage } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { exportToCSV, exportToExcel, exportToPDF, type ExportData } from "@/lib/export";

interface ExportDropdownProps {
  data: ExportData;
  filename: string;
  disabled?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  onExport?: (format: "csv" | "excel" | "pdf") => void;
}

export function ExportDropdown({
  data,
  filename,
  disabled = false,
  size = "sm",
  variant = "outline",
  className,
  onExport,
}: ExportDropdownProps) {
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    try {
      switch (format) {
        case "csv":
          exportToCSV(data, filename);
          break;
        case "excel":
          exportToExcel(data, filename);
          break;
        case "pdf":
          exportToPDF(data, filename);
          break;
      }
      onExport?.(format);
    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
    }
  };

  const hasData = data.rows.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || !hasData}
          className={className}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Export as...</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileImage className="mr-2 h-4 w-4" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact export buttons for inline use
interface ExportButtonsProps {
  data: ExportData;
  filename: string;
  showLabels?: boolean;
  className?: string;
}

export function ExportButtons({
  data,
  filename,
  showLabels = false,
  className,
}: ExportButtonsProps) {
  const hasData = data.rows.length > 0;

  return (
    <div className={`flex gap-1 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => exportToCSV(data, filename)}
        disabled={!hasData}
        title="Export as CSV"
      >
        <FileText className="h-4 w-4" />
        {showLabels && <span className="ml-1">CSV</span>}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => exportToExcel(data, filename)}
        disabled={!hasData}
        title="Export as Excel"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {showLabels && <span className="ml-1">Excel</span>}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => exportToPDF(data, filename)}
        disabled={!hasData}
        title="Export as PDF"
      >
        <FileImage className="h-4 w-4" />
        {showLabels && <span className="ml-1">PDF</span>}
      </Button>
    </div>
  );
}
