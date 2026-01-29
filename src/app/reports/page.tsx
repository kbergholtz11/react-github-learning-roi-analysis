"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Users, 
  Award, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  Star
} from "lucide-react";
import { useState } from "react";

// Report statistics
const reportStats = {
  totalLearners: 5000,
  certifiedUsers: 1625,
  certificationRate: 32.5,
  avgROI: 3.8,
  adoptionRate: 66.4,
};

// Quick export options
const quickExports = [
  {
    title: "Full Dataset Export",
    description: "Export all 5,000 learner records",
    icon: Users,
    count: 5000,
    format: "CSV, Excel, PDF"
  },
  {
    title: "Certified Users Only",
    description: "Export certified user records",
    icon: Award,
    count: 1625,
    format: "CSV, Excel, PDF"
  },
  {
    title: "Learning Users (Not Yet Certified)",
    description: "Export learning user records",
    icon: TrendingUp,
    count: 3375,
    format: "CSV, Excel, PDF"
  },
  {
    title: "Champions & Specialists",
    description: "Export elite learner records",
    icon: Star,
    count: 423,
    format: "CSV, Excel, PDF"
  },
];

// Report presets
const reportPresets = [
  { id: "basic", name: "Basic Info", fields: ["user_id", "email", "journey_stage", "is_certified"] },
  { id: "certification", name: "Certification Details", fields: ["user_id", "is_certified", "cert_date", "cert_type", "days_to_cert"] },
  { id: "usage", name: "Product Usage", fields: ["user_id", "product_usage_hours", "products_using", "adoption_status"] },
  { id: "all", name: "All Fields", fields: [] },
];

// Available fields for custom reports
const availableFields = [
  { id: "user_id", name: "User ID", category: "Identity" },
  { id: "email", name: "Email", category: "Identity" },
  { id: "journey_stage", name: "Journey Stage", category: "Progress" },
  { id: "engagement_level", name: "Engagement Level", category: "Progress" },
  { id: "is_certified", name: "Is Certified", category: "Certification" },
  { id: "cert_date", name: "Certification Date", category: "Certification" },
  { id: "cert_type", name: "Certification Type", category: "Certification" },
  { id: "days_to_cert", name: "Days to Certification", category: "Certification" },
  { id: "product_usage_hours", name: "Product Usage Hours", category: "Usage" },
  { id: "products_using", name: "Products Using", category: "Usage" },
  { id: "learning_hours", name: "Learning Hours", category: "Learning" },
  { id: "total_events", name: "Total Events", category: "Learning" },
  { id: "roi_multiplier", name: "ROI Multiplier", category: "Metrics" },
];

function ExportButton({ format, onClick }: { format: string; onClick: () => void }) {
  const icons = {
    CSV: FileText,
    Excel: FileSpreadsheet,
    PDF: File,
  };
  const Icon = icons[format as keyof typeof icons] || FileText;
  
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
      <Icon className="h-4 w-4" />
      {format}
    </Button>
  );
}

export default function ReportsPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>(["user_id", "email", "journey_stage"]);
  const [filterCertified, setFilterCertified] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("basic");

  const handleExport = (format: string, type: string) => {
    // In production, this would trigger actual export
    console.log(`Exporting ${type} as ${format}`);
    alert(`Exporting ${type} as ${format}... (Demo)`);
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Export Center</h1>
        <p className="text-muted-foreground mt-1">
          Generate and download comprehensive reports for stakeholder presentations.
          Export data in multiple formats for further analysis.
        </p>
      </div>

      {/* Quick Exports Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Download className="h-5 w-5" />
          Quick Exports
        </h2>
        <p className="text-muted-foreground mb-4">Export commonly used datasets with a single click.</p>
        
        <div className="grid gap-4 md:grid-cols-2">
          {quickExports.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    <Badge variant="secondary">{item.count.toLocaleString()} records</Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <ExportButton format="CSV" onClick={() => handleExport("CSV", item.title)} />
                    <ExportButton format="Excel" onClick={() => handleExport("Excel", item.title)} />
                    <ExportButton format="PDF" onClick={() => handleExport("PDF", item.title)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Executive Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Executive Summary Report
          </CardTitle>
          <CardDescription>Generate a high-level summary report with key metrics for stakeholders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{reportStats.totalLearners.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Learners</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{reportStats.certifiedUsers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Certified ({reportStats.certificationRate}%)</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{reportStats.avgROI}×</p>
              <p className="text-sm text-muted-foreground">ROI Multiplier</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{reportStats.adoptionRate}%</p>
              <p className="text-sm text-muted-foreground">Product Adoption</p>
            </div>
          </div>

          <div className="flex gap-2">
            <ExportButton format="CSV" onClick={() => handleExport("CSV", "Executive Summary")} />
            <ExportButton format="Excel" onClick={() => handleExport("Excel", "Executive Summary")} />
            <ExportButton format="PDF" onClick={() => handleExport("PDF", "Executive Summary")} />
          </div>
        </CardContent>
      </Card>

      {/* Custom Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Custom Report Builder
          </CardTitle>
          <CardDescription>Configure custom reports with specific metrics and filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fields" className="space-y-4">
            <TabsList>
              <TabsTrigger value="fields">Select Fields</TabsTrigger>
              <TabsTrigger value="filters">Apply Filters</TabsTrigger>
              <TabsTrigger value="preview">Preview & Export</TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Quick Presets:</p>
                <div className="flex gap-2 flex-wrap">
                  {reportPresets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedPreset(preset.id);
                        if (preset.fields.length > 0) {
                          setSelectedFields(preset.fields);
                        } else {
                          setSelectedFields(availableFields.map(f => f.id));
                        }
                      }}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Available Fields:</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {availableFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={field.id}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <label htmlFor={field.id} className="text-sm cursor-pointer">
                        {field.name}
                        <span className="text-xs text-muted-foreground ml-1">({field.category})</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="filter-certified"
                    checked={filterCertified}
                    onCheckedChange={(checked) => setFilterCertified(checked as boolean)}
                  />
                  <label htmlFor="filter-certified" className="text-sm cursor-pointer">
                    Certified users only
                  </label>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Additional filters like Journey Stage and Learner Status would be available in production.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Custom Report</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFields.length} fields selected • {filterCertified ? "Certified only" : "All users"}
                    </p>
                  </div>
                  <Badge>
                    {filterCertified ? reportStats.certifiedUsers.toLocaleString() : reportStats.totalLearners.toLocaleString()} records
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Selected Fields:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedFields.map((fieldId) => {
                      const field = availableFields.find(f => f.id === fieldId);
                      return (
                        <Badge key={fieldId} variant="secondary" className="text-xs">
                          {field?.name || fieldId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <ExportButton format="CSV" onClick={() => handleExport("CSV", "Custom Report")} />
                  <ExportButton format="Excel" onClick={() => handleExport("Excel", "Custom Report")} />
                  <ExportButton format="PDF" onClick={() => handleExport("PDF", "Custom Report")} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Reports
          </CardTitle>
          <CardDescription>Configure automated report generation and delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-lg border border-dashed bg-muted/20 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure automated report generation and email delivery. Features will include 
              daily/weekly/monthly schedules, email distribution lists, custom templates, and 
              automated data refresh.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
