"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import API_URL from '../config';

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  headquarters?: string;
  founded?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isAddingAI, setIsAddingAI] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const data = await res.json();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      setError("Please enter a company name");
      return;
    }

    setAddingCompany(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCompanyName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add company");
      }

      setNewCompanyName("");
      await fetchCompanies();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setAddingCompany(false);
    }
  };

  const handleAddCompanyWithAI = async () => {
    if (!newCompanyName.trim()) {
      setError("Please enter a company name");
      return;
    }

    setIsAddingAI(true);
    setError("");
    try {
      const res = await fetch(API_URL + "/companies/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName: newCompanyName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add company with AI");
      }

      setNewCompanyName("");
      await fetchCompanies();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setIsAddingAI(false);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCompanyId(companyId);
    setError("");
    try {
      const res = await fetch(API_URL + `/companies?id=${companyId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete company");
      }

      await fetchCompanies();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setDeletingCompanyId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Manage home building companies</p>
        </div>

        {/* Add Company Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Enter company name..."
                className="flex-1 min-w-[200px] px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddCompany();
                  }
                }}
              />
              {/* <Button
                onClick={handleAddCompany}
                disabled={addingCompany || !newCompanyName.trim()}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button> */}
              <Button
                onClick={handleAddCompanyWithAI}
                disabled={isAddingAI || !newCompanyName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingAI ? "Adding with AI..." : "Add with AI"}
              </Button>
            </div>
            {error && (
              <div className="mt-4">
                <ErrorMessage message={error} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Companies List */}
        {error && !addingCompany && !isAddingAI && (
          <ErrorMessage message={error} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Card key={company._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCompany(company._id, company.name)}
                      disabled={deletingCompanyId === company._id}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.description && (
                    <p className="text-sm text-muted-foreground">{company.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {company.headquarters && (
                      <Badge variant="secondary" className="text-xs">
                        📍 {company.headquarters}
                      </Badge>
                    )}
                    {company.founded && (
                      <Badge variant="secondary" className="text-xs">
                        🏛️ Founded {company.founded}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {companies.length === 0 && !loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">No companies found. Add one to get started!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

