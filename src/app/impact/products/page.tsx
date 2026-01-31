import type { Metadata } from "next";
import { ProductImpactDashboard } from "./product-impact-dashboard";

export const metadata: Metadata = {
  title: "Product Impact | Learning ROI",
  description: "Analyze the correlation between learning activities and GitHub product adoption",
};

export default function ProductImpactPage() {
  return <ProductImpactDashboard />;
}
