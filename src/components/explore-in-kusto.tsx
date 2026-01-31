"use client";

import { ExternalLink, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ExploreInKusto - Link to explore data in Azure Data Explorer
 * 
 * Following GitHub Data Principle: "Self-serve is best"
 * Every visualization should link back to the underlying query
 * so users can drill into the data themselves.
 * 
 * @param query - The KQL query to run in Kusto
 * @param database - The database to query (default: "canonical")
 * @param cluster - The Kusto cluster (default: gh-analytics)
 * @param variant - Button variant style
 */

interface ExploreInKustoProps {
  query: string;
  database?: string;
  cluster?: "gh-analytics" | "cse-analytics";
  label?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

const CLUSTERS = {
  "gh-analytics": "https://dataexplorer.azure.com/clusters/gh-analytics.eastus",
  "cse-analytics": "https://dataexplorer.azure.com/clusters/cse-analytics.centralus",
};

export function ExploreInKusto({
  query,
  database = "canonical",
  cluster = "gh-analytics",
  label = "Explore in Kusto",
  variant = "outline",
  size = "sm",
  showIcon = true,
}: ExploreInKustoProps) {
  const clusterUrl = CLUSTERS[cluster];
  
  // Encode query for URL
  const encodedQuery = encodeURIComponent(query);
  const kustoUrl = `${clusterUrl}/databases/${database}?query=${encodedQuery}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="gap-1.5"
            asChild
          >
            <a 
              href={kustoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {showIcon && <Database className="h-3.5 w-3.5" />}
              {label}
              <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">
            Open this query in Azure Data Explorer to explore the data further.
            You can modify the query, add filters, and create your own visualizations.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ViewInDataDot - Link to view table documentation in Data Dot
 */
interface ViewInDataDotProps {
  table: string;
  schema?: "canonical" | "hydro" | "snapshots" | "ace";
  label?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ViewInDataDot({
  table,
  schema = "canonical",
  label = "View in Data Dot",
  variant = "ghost",
  size = "sm",
}: ViewInDataDotProps) {
  const dataDotUrl = `https://data.githubapp.com/warehouse/hive/${schema}/${table}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className="gap-1.5 text-muted-foreground"
            asChild
          >
            <a 
              href={dataDotUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {label}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            View table schema, documentation, and sample data in Data Dot.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * DataSourceInfo - Shows information about the data source
 */
interface DataSourceInfoProps {
  source: string;
  query?: string;
  dataDotTable?: string;
  dataDotSchema?: "canonical" | "hydro" | "snapshots" | "ace";
  cluster?: "gh-analytics" | "cse-analytics";
}

export function DataSourceInfo({
  source,
  query,
  dataDotTable,
  dataDotSchema = "canonical",
  cluster = "gh-analytics",
}: DataSourceInfoProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Source: {source}</span>
      {dataDotTable && (
        <ViewInDataDot 
          table={dataDotTable} 
          schema={dataDotSchema}
          label="Docs"
          size="sm"
        />
      )}
      {query && (
        <ExploreInKusto
          query={query}
          cluster={cluster}
          label="Explore"
          variant="ghost"
          size="sm"
        />
      )}
    </div>
  );
}
