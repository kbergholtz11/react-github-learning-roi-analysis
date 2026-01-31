"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Award, 
  Zap, 
  GitPullRequest, 
  TrendingUp, 
  DollarSign,
  Search,
  Building2,
  ArrowLeft,
} from "lucide-react";
import { DataFreshness } from "@/components/data-freshness";
import { ExploreInKusto } from "@/components/explore-in-kusto";

interface CompanyROIData {
  total_learners: number;
  certified_learners: number;
  total_certifications: number;
  avg_certifications_per_learner: number;
  copilot_adopters: number;
  actions_adopters: number;
  avg_copilot_usage: number;
  avg_github_activity: number;
  certification_rate: number;
  copilot_adoption_rate: number;
}

interface CompanySearchResult {
  company: string;
  learner_count: number;
  certified_count: number;
}

async function fetchCompanyROI(company: string): Promise<CompanyROIData | null> {
  if (!company) return null;
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(
    `${baseUrl}/api/company/${encodeURIComponent(company)}/roi`
  );
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error("Failed to fetch company ROI data");
  }
  
  return response.json();
}

async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  if (!query || query.length < 2) return [];
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(
    `${baseUrl}/api/companies/search?q=${encodeURIComponent(query)}`
  );
  
  if (!response.ok) return [];
  
  const data = await response.json();
  return data.companies || [];
}

// ROI calculation constants (based on industry research)
const ROI_CONSTANTS = {
  avgDeveloperSalary: 150000, // Annual salary
  productivityGainCertified: 0.15, // 15% productivity increase
  copilotProductivityGain: 0.25, // 25% faster coding with Copilot
  certificationCost: 200, // Exam cost per certification
  trainingHours: 40, // Average hours to prepare
  hourlyRate: 75, // Hourly cost of developer time
};

function calculateROI(data: CompanyROIData) {
  const {
    total_learners,
    certified_learners,
    total_certifications,
    copilot_adopters,
  } = data;

  // Investment: Training time + certification costs
  const trainingCost = total_certifications * ROI_CONSTANTS.trainingHours * ROI_CONSTANTS.hourlyRate;
  const certCost = total_certifications * ROI_CONSTANTS.certificationCost;
  const totalInvestment = trainingCost + certCost;

  // Returns: Productivity gains
  const certifiedProductivityGain = certified_learners * 
    ROI_CONSTANTS.avgDeveloperSalary * 
    ROI_CONSTANTS.productivityGainCertified;
  
  const copilotProductivityGain = copilot_adopters *
    ROI_CONSTANTS.avgDeveloperSalary *
    ROI_CONSTANTS.copilotProductivityGain;

  const totalReturn = certifiedProductivityGain + copilotProductivityGain;

  const roi = totalInvestment > 0 ? ((totalReturn - totalInvestment) / totalInvestment * 100) : 0;

  return {
    totalInvestment,
    totalReturn,
    roi,
    certifiedProductivityGain,
    copilotProductivityGain,
  };
}

export function CompanyROIDashboard() {
  const params = useParams();
  const router = useRouter();
  const companyParam = params?.company as string;
  const decodedCompany = companyParam ? decodeURIComponent(companyParam) : "";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(!decodedCompany);

  const { data: companyData, isLoading, error } = useQuery({
    queryKey: ["company-roi", decodedCompany],
    queryFn: () => fetchCompanyROI(decodedCompany),
    enabled: !!decodedCompany,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["company-search", searchQuery],
    queryFn: () => searchCompanies(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const handleCompanySelect = (company: string) => {
    router.push(`/company/${encodeURIComponent(company)}`);
    setShowSearch(false);
  };

  const roiData = companyData ? calculateROI(companyData) : null;

  // Search view
  if (showSearch || !decodedCompany) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company ROI Calculator
            </CardTitle>
            <CardDescription>
              Search for a company to view their learning ROI metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg divide-y">
                {searchResults.map((result) => (
                  <button
                    key={result.company}
                    onClick={() => handleCompanySelect(result.company)}
                    className="w-full p-3 text-left hover:bg-muted flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{result.company}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.learner_count.toLocaleString()} learners
                      </div>
                    </div>
                    <Badge variant="outline">
                      {result.certified_count} certified
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No companies found matching &quot;{searchQuery}&quot;
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Not found state
  if (!companyData) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground mb-4">
              No data found for &quot;{decodedCompany}&quot;
            </p>
            <Button onClick={() => setShowSearch(true)}>
              Search for another company
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COMPANY_QUERY = `
// Company learner metrics for ${decodedCompany}
canonical_account_hierarchy_global_all
| where customer_name == "${decodedCompany}" or salesforce_account_name == "${decodedCompany}"
| take 100
`;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Search companies
          </Button>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            {decodedCompany}
          </h1>
          <p className="text-muted-foreground mt-1">
            Learning ROI Calculator and Impact Analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataFreshness variant="badge" />
          <ExploreInKusto query={COMPANY_QUERY} database="canonical" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Total Learners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {companyData.total_learners.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Employees in learning programs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-green-500" />
              Certified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {companyData.certified_learners.toLocaleString()}
            </div>
            <div className="mt-2">
              <Progress value={companyData.certification_rate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {companyData.certification_rate.toFixed(1)}% certification rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              Copilot Adopters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {companyData.copilot_adopters.toLocaleString()}
            </div>
            <div className="mt-2">
              <Progress value={companyData.copilot_adoption_rate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {companyData.copilot_adoption_rate.toFixed(1)}% adoption rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-orange-500" />
              Total Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {companyData.total_certifications.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {companyData.avg_certifications_per_learner.toFixed(1)} per learner
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROI Calculator */}
      {roiData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Estimated Learning ROI
            </CardTitle>
            <CardDescription>
              Based on industry research and your company&apos;s learning metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Investment</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${roiData.totalInvestment.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Training time + certification costs
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Estimated Return</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${roiData.totalReturn.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Annual productivity gains
                </p>
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">ROI</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {roiData.roi > 0 ? "+" : ""}{roiData.roi.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Return on investment
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Return Breakdown</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Certification Productivity Gains</span>
                  </div>
                  <span className="font-medium text-green-600">
                    +${roiData.certifiedProductivityGain.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Copilot Productivity Gains</span>
                  </div>
                  <span className="font-medium text-green-600">
                    +${roiData.copilotProductivityGain.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <strong>Methodology:</strong> ROI calculated using industry benchmarks including 
              15% productivity increase for certified developers, 25% coding speed improvement 
              with GitHub Copilot, average developer salary of $150K, and 40 hours of training 
              per certification.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companyData.certification_rate < 30 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Increase Certification Rate</h4>
                  <p className="text-sm text-muted-foreground">
                    Your certification rate of {companyData.certification_rate.toFixed(1)}% 
                    is below the target of 30%. Consider offering certification incentives 
                    or dedicated study time.
                  </p>
                </div>
              </div>
            )}
            
            {companyData.copilot_adoption_rate < 50 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Boost Copilot Adoption</h4>
                  <p className="text-sm text-muted-foreground">
                    With {companyData.copilot_adoption_rate.toFixed(1)}% Copilot adoption, 
                    there&apos;s opportunity for significant productivity gains. Consider 
                    the GitHub Copilot certification program.
                  </p>
                </div>
              </div>
            )}

            {companyData.certification_rate >= 30 && companyData.copilot_adoption_rate >= 50 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Great Progress!</h4>
                  <p className="text-sm text-muted-foreground">
                    Your organization is performing well with {companyData.certification_rate.toFixed(1)}% 
                    certification rate and {companyData.copilot_adoption_rate.toFixed(1)}% Copilot adoption. 
                    Consider advanced certifications like GitHub Advanced Security.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
