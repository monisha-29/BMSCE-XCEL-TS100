import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Fake auth — accept any non-empty credentials
    setTimeout(() => {
      if (formData.email && formData.password.length >= 4) {
        const fakeUser = {
          _id: "user_001",
          name: formData.email.split("@")[0],
          email: formData.email,
        };
        const fakeToken = btoa(JSON.stringify({ id: fakeUser._id, exp: Date.now() / 1000 + 86400 }));

        localStorage.setItem("token", fakeToken);
        localStorage.setItem("user", JSON.stringify(fakeUser));
        navigate("/dashboard");
      } else {
        setError("Please enter a valid email and password (min 4 chars)");
      }
      setLoading(false);
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm border-primary/20 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-primary-foreground">C</span>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your curia.AI account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/15 border border-destructive/50 text-destructive text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-glow transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link 
              to="/signup" 
              className="text-primary hover:text-primary-glow transition-colors duration-300 font-medium"
            >
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;