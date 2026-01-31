import type { Metadata } from "next";
import { DataQualityDashboard } from "./data-quality-dashboard";

export const metadata: Metadata = {
  title: "Data Quality | Admin",
  description: "Monitor data quality, freshness, and sync status",
};

export default function DataQualityPage() {
  return <DataQualityDashboard />;
}
