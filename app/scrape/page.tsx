"use client"

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Download, Loader2 } from "lucide-react";
import API_URL from '../config';

interface ScrapeResult {
  success: boolean;
  message: string;
  saved: number;
  errors: number;
  errorDetails?: Array<{ plan: string; error: string }>;
  breakdown?: {
    now: { saved: number; errors: number };
    plan: { saved: number; errors: number };
  };
  plans: Array<{
    id: string;
    plan_name: string;
    price: number;
    company: string;
    community: string;
    type: string;
  }>;
}

export default function ScrapePage() {
  const [company, setCompany] = useState("");
  const [community, setCommunity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // Fetch companies on mount
  React.useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(API_URL + "/companies");
        if (!res.ok) throw new Error("Failed to fetch companies");
        const data = await res.json();
        setCompanies(data.map((c: any) => c.name));
      } catch (err: any) {
        setError(err.message || "Failed to load companies");
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  const handleScrape = async () => {
    if (!company || !community) {
      setError("Please select a company and enter a community name");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(API_URL + "/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company,
          community,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to scrape plans");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Scrape Plans with ChatGPT</h1>
          <p className="text-sm text-muted-foreground">Fetch current plans and quick move-ins using AI</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Scrape Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                {loadingCompanies ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading companies...</span>
                  </div>
                ) : (
                  <Select value={company} onValueChange={setCompany}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((comp) => (
                        <SelectItem key={comp} value={comp}>
                          {comp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Community</label>
                <input
                  type="text"
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  placeholder="e.g., elevon, cambridge, brookville..."
                  className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Button
                onClick={handleScrape}
                disabled={loading || !company || !community || loadingCompanies}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scraping both Quick Move-ins & Home Plans...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Scrape All Plans (Quick Move-ins + Home Plans)
                  </>
                )}
              </Button>

              {error && (
                <div className="mt-4">
                  <ErrorMessage message={error} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scrape Results</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={result.success ? "success" : "destructive"}>
                    {result.success ? "Success" : "Error"}
                  </Badge>
                  <Badge variant="secondary">{result.saved} saved</Badge>
                  {result.errors > 0 && (
                    <Badge variant="destructive">{result.errors} errors</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">{result.message}</p>

              {result.breakdown && (
                <div className="mb-4 p-4 bg-muted rounded-md">
                  <h3 className="font-semibold mb-2">Breakdown:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Quick Move-ins:</p>
                      <p className="text-muted-foreground">
                        {result.breakdown.now.saved} saved, {result.breakdown.now.errors} errors
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Home Plans:</p>
                      <p className="text-muted-foreground">
                        {result.breakdown.plan.saved} saved, {result.breakdown.plan.errors} errors
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.errorDetails && result.errorDetails.length > 0 && (
                <div className="mb-4 p-4 bg-destructive/10 rounded-md">
                  <h3 className="font-semibold mb-2">Errors:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.errorDetails.map((err, idx) => (
                      <li key={idx}>
                        {err.plan}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.plans && result.plans.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Saved Plans:</h3>
                  <div className="space-y-2">
                    {result.plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3 bg-muted rounded-md flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{plan.plan_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {plan.company} • {plan.community} • {plan.type}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          ${plan.price.toLocaleString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

