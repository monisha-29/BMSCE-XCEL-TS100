import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JiraConfig {
  jiraUrl: string;
  jiraProjectKey: string;
  jiraEmail: string;
  jiraApiToken: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [config, setConfig] = useState<JiraConfig>({
    jiraUrl: "",
    jiraProjectKey: "",
    jiraEmail: "",
    jiraApiToken: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing config from localStorage
    const stored = localStorage.getItem("jiraConfig");
    if (stored) {
      setConfig(JSON.parse(stored));
      setSaved(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("jiraConfig", JSON.stringify(config));
    setSaved(true);
    toast({ title: "Settings Saved", description: "Jira configuration updated successfully" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4 hover:text-primary">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your Jira integration to auto-create tickets from meeting action items
          </p>
        </div>

        {/* Jira Config Card */}
        <Card className="border-primary/20 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src="https://cdn.worldvectorlogo.com/logos/jira-1.svg" alt="Jira" className="h-5 w-5" />
              Jira Configuration
            </CardTitle>
            <CardDescription>
              Connect your Jira account so Curia AI can create tickets automatically.{" "}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Get API token <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="jiraUrl">Jira URL</Label>
                <Input
                  id="jiraUrl"
                  name="jiraUrl"
                  type="url"
                  placeholder="https://yourteam.atlassian.net"
                  value={config.jiraUrl}
                  onChange={handleChange}
                  required
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">Your Atlassian workspace URL</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jiraProjectKey">Project Key</Label>
                <Input
                  id="jiraProjectKey"
                  name="jiraProjectKey"
                  type="text"
                  placeholder="e.g. AIMEETING"
                  value={config.jiraProjectKey}
                  onChange={handleChange}
                  required
                  className="bg-background/50 border-border/50 focus:border-primary/50 uppercase"
                />
                <p className="text-xs text-muted-foreground">Found in your Jira project URL (the short code before issue numbers)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jiraEmail">Jira Email</Label>
                <Input
                  id="jiraEmail"
                  name="jiraEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={config.jiraEmail}
                  onChange={handleChange}
                  required
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jiraApiToken">API Token</Label>
                <Input
                  id="jiraApiToken"
                  name="jiraApiToken"
                  type="password"
                  placeholder="Paste your Jira API token"
                  value={config.jiraApiToken}
                  onChange={handleChange}
                  required
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground">
                  Generate at{" "}
                  <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Atlassian API Tokens
                  </a>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300 hover:scale-[1.02]"
              >
                {saved ? (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Saved</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Configuration</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
