"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useUrlParams } from "@/hooks/use-url-params";

// Sample learner data
const learners = [
  { id: 1, name: "Sarah Chen", email: "sarah.chen@company.com", department: "Engineering", path: "GitHub Actions", progress: 85, status: "active", enrolled: "2025-11-15", lastActive: "2 hours ago" },
  { id: 2, name: "Mike Johnson", email: "mike.j@company.com", department: "DevOps", path: "GitHub Copilot", progress: 100, status: "certified", enrolled: "2025-10-22", lastActive: "1 day ago" },
  { id: 3, name: "Emily Davis", email: "emily.d@company.com", department: "Engineering", path: "GitHub Foundations", progress: 42, status: "active", enrolled: "2025-12-01", lastActive: "5 hours ago" },
  { id: 4, name: "James Wilson", email: "james.w@company.com", department: "Security", path: "Advanced Security", progress: 67, status: "active", enrolled: "2025-11-08", lastActive: "3 hours ago" },
  { id: 5, name: "Lisa Anderson", email: "lisa.a@company.com", department: "Platform", path: "GitHub Admin", progress: 100, status: "certified", enrolled: "2025-09-15", lastActive: "1 week ago" },
  { id: 6, name: "David Kim", email: "david.k@company.com", department: "Engineering", path: "GitHub Actions", progress: 23, status: "active", enrolled: "2025-12-10", lastActive: "1 hour ago" },
  { id: 7, name: "Amanda Foster", email: "amanda.f@company.com", department: "QA", path: "GitHub Foundations", progress: 91, status: "active", enrolled: "2025-10-30", lastActive: "4 hours ago" },
  { id: 8, name: "Robert Taylor", email: "robert.t@company.com", department: "Engineering", path: "GitHub Copilot", progress: 55, status: "active", enrolled: "2025-11-20", lastActive: "6 hours ago" },
  { id: 9, name: "Jennifer Martinez", email: "jennifer.m@company.com", department: "DevOps", path: "GitHub Actions", progress: 100, status: "completed", enrolled: "2025-10-05", lastActive: "2 days ago" },
  { id: 10, name: "Chris Brown", email: "chris.b@company.com", department: "Security", path: "Advanced Security", progress: 34, status: "inactive", enrolled: "2025-11-01", lastActive: "2 weeks ago" },
];

export default function LearnerExplorerPage() {
  // Use URL params for filter persistence - shareable links!
  const { params, setParams, hasActiveFilters, clearParams } = useUrlParams({
    search: '',
    page: 1,
    status: '',
    department: '',
  });
  
  const searchTerm = params.search;
  const currentPage = params.page;
  const statusFilter = params.status;
  const departmentFilter = params.department;
  const itemsPerPage = 8;

  const filteredLearners = learners.filter(learner => {
    const matchesSearch = !searchTerm || 
      learner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learner.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      learner.path.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || learner.status === statusFilter;
    const matchesDepartment = !departmentFilter || learner.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const totalPages = Math.ceil(filteredLearners.length / itemsPerPage);
  const paginatedLearners = filteredLearners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'certified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'active': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learner Explorer</h1>
          <p className="text-muted-foreground">
            Search and analyze individual learner progress
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by name, email, department, or learning path..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setParams({ search: e.target.value, page: 1 })}
                aria-label="Search learners"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setParams({ status: e.target.value, page: 1 })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="certified">Certified</option>
              <option value="completed">Completed</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setParams({ department: e.target.value, page: 1 })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="DevOps">DevOps</option>
              <option value="Security">Security</option>
              <option value="Platform">Platform</option>
              <option value="QA">QA</option>
            </select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearParams} className="gap-1">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{learners.length}</div>
            <p className="text-xs text-muted-foreground">Total Learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{learners.filter(l => l.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{learners.filter(l => l.status === 'certified').length}</div>
            <p className="text-xs text-muted-foreground">Certified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{Math.round(learners.reduce((acc, l) => acc + l.progress, 0) / learners.length)}%</div>
            <p className="text-xs text-muted-foreground">Avg Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Learner Table */}
      <Card>
        <CardHeader>
          <CardTitle>Learners ({filteredLearners.length})</CardTitle>
          <CardDescription>Click on a learner to view their detailed profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-7 gap-4 p-4 bg-muted/50 text-sm font-medium">
              <div className="col-span-2">Learner</div>
              <div>Department</div>
              <div>Learning Path</div>
              <div>Progress</div>
              <div>Status</div>
              <div>Last Active</div>
            </div>
            {paginatedLearners.map((learner) => (
              <div 
                key={learner.id} 
                className="grid grid-cols-7 gap-4 p-4 border-t items-center hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="col-span-2 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">{learner.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="font-medium">{learner.name}</p>
                    <p className="text-xs text-muted-foreground">{learner.email}</p>
                  </div>
                </div>
                <div className="text-sm">{learner.department}</div>
                <div className="text-sm">{learner.path}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${learner.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{learner.progress}%</span>
                  </div>
                </div>
                <div>
                  <Badge className={getStatusColor(learner.status)}>
                    {learner.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{learner.lastActive}</div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLearners.length)} of {filteredLearners.length} learners
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setParams({ page: Math.max(1, currentPage - 1) })}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm" aria-live="polite">Page {currentPage} of {totalPages}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setParams({ page: Math.min(totalPages, currentPage + 1) })}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
