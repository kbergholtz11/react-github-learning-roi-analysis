import type { Metadata } from "next";
import { CompanyROIDashboard } from "./company-roi-dashboard";

export const metadata: Metadata = {
  title: "Company ROI Calculator | Learning ROI",
  description: "Calculate and analyze learning ROI for specific companies",
};

export default function CompanyROIPage() {
  return <CompanyROIDashboard />;
}
