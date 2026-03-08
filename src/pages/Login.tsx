import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { login, industryRegister, type IndustryRegisterBody } from "@/lib/api";

const INDUSTRY_TYPES = ["Tech", "Fintech", "SaaS", "AI", "Consulting", "Healthcare", "Manufacturing", "Other"];
const COMPANY_SIZE_OPTIONS = [
  { value: "size_1_10", label: "1-10" },
  { value: "size_11_50", label: "11-50" },
  { value: "size_50_200", label: "50-200" },
  { value: "size_200_plus", label: "200+" },
];
const HIRING_INTENTS = ["Internships", "Full-time", "Both"];

export default function Login() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [companySize, setCompanySize] = useState("size_1_10");
  const [headquarters, setHeadquarters] = useState("");
  const [briefDescription, setBriefDescription] = useState("");
  const [hiringIntent, setHiringIntent] = useState("Both");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { jwt, user } = await login(email.trim(), password);
      setAuth(jwt, user);
      navigate("/industry/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName.trim() || !officialEmail.trim() || !password || !industryType) {
      setError("Company name, official email, password, and industry type are required.");
      return;
    }
    setLoading(true);
    try {
      const body: IndustryRegisterBody = {
        companyName: companyName.trim(),
        officialEmail: officialEmail.trim(),
        password,
        industryType,
        companySize,
        headquarters: headquarters.trim(),
        briefDescription: briefDescription.slice(0, 300),
        hiringIntent,
      };
      const { jwt, user } = await industryRegister(body);
      setAuth(jwt, user);
      navigate("/industry/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--gradient-hero)" }}>
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 text-white relative">
        <div className="absolute top-6 left-6">
          <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold">Industry Portal</h1>
          <p className="text-white/70 text-lg">Sign in to upload JDs, shortlist talent, and contribute to the ecosystem.</p>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background rounded-l-[2rem] lg:rounded-l-[3rem] dark:bg-background overflow-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md py-6">
          <div className="lg:hidden mb-8">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>

          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>{isSignup ? "Industry Signup" : "Welcome Back"}</CardTitle>
                  <CardDescription>Industry Portal</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {error && (
                <>
                  <p className={`text-sm text-destructive bg-destructive/10 p-2 rounded-md ${isSignup ? "mb-4" : "mb-2"}`}>{error}</p>
                  {!isSignup && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Using admin credentials? <Link to="/admin/login" className="text-primary font-medium hover:underline">Sign in at Admin login</Link>.
                    </p>
                  )}
                </>
              )}
              {isSignup ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officialEmail">Official Email *</Label>
                    <Input id="officialEmail" type="email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} placeholder="you@company.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password *</Label>
                    <div className="relative">
                      <Input id="signupPassword" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry Type *</Label>
                    <Select value={industryType} onValueChange={setIndustryType} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select value={companySize} onValueChange={setCompanySize}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headquarters">Headquarters</Label>
                    <Input id="headquarters" value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="City, Country" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="briefDescription">Brief Description (max 300 chars)</Label>
                    <textarea id="briefDescription" maxLength={300} value={briefDescription} onChange={(e) => setBriefDescription(e.target.value)} placeholder="What does your company do?" className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hiring Intent</Label>
                    <Select value={hiringIntent} onValueChange={setHiringIntent}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HIRING_INTENTS.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full rounded-xl" size="lg" disabled={loading}>
                    {loading ? "Creating account…" : "Create Account"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full rounded-xl" size="lg" disabled={loading}>
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>
                </form>
              )}
              <p className="text-center text-sm text-muted-foreground mt-4">
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button type="button" onClick={() => { setIsSignup(!isSignup); setError(""); }} className="text-primary font-medium hover:underline">
                  {isSignup ? "Sign In" : "Sign Up"}
                </button>
              </p>
              <p className="text-center text-sm text-muted-foreground mt-2">
                <Link to="/admin/login" className="text-primary font-medium hover:underline">Admin? Sign in here</Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
