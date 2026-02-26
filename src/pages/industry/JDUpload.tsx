import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createJD } from "@/lib/api";
import { readFileAsText } from "@/lib/jdUtils";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const ROLE_LABELS: Record<string, string> = { intern: "Intern", fulltime: "Full-time", contract: "Contract" };

export default function JDUpload() {
  const [inputMethod, setInputMethod] = useState<"text" | "file">("text");
  const [jdText, setJdText] = useState("");
  const [roleType, setRoleType] = useState("");
  const [fileText, setFileText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const content = inputMethod === "text" ? jdText.trim() : fileText.trim();
  const canProcess = roleType && content.length > 0;

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await readFileAsText(file);
      setFileText(text);
    } catch (err) {
      setError((err as Error).message || "Failed to read file");
      setFileText("");
    }
    e.target.value = "";
  };

  const handleProcess = async () => {
    if (!canProcess) return;
    setProcessing(true);
    setError("");
    try {
      const title = `${ROLE_LABELS[roleType] || roleType} - ${formatDate(new Date())}`;
      const created = await createJD({ title, jd: content, status: "draft" });
      navigate("/industry/competency", {
        state: {
          selectedJdId: created.id,
          savedJd: {
            id: created.id,
            title: (created as { title?: string }).title ?? title,
            status: (created as { status?: string }).status ?? "draft",
            createdAt: (created as { createdAt?: string }).createdAt,
            updatedAt: (created as { updatedAt?: string }).updatedAt,
          },
        },
      });
    } catch (err) {
      setError((err as Error).message || "Failed to save JD");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Upload Job Description</h2>
        <p className="text-muted-foreground mt-1">Paste or upload a JD and our AI will generate a competency matrix.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label>Role Type</Label>
            <Select value={roleType} onValueChange={setRoleType}>
              <SelectTrigger><SelectValue placeholder="Select role type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="fulltime">Full-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant={inputMethod === "text" ? "default" : "outline"} size="sm" onClick={() => setInputMethod("text")} className="rounded-lg">
              <FileText className="h-4 w-4 mr-1" /> Paste Text
            </Button>
            <Button variant={inputMethod === "file" ? "default" : "outline"} size="sm" onClick={() => setInputMethod("file")} className="rounded-lg">
              <Upload className="h-4 w-4 mr-1" /> Upload PDF
            </Button>
          </div>
          {inputMethod === "text" ? (
            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the full job description here..." rows={12} className="font-mono text-sm" />
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={onFileChange}
              />
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click to upload JD (PDF or text)</p>
              {fileText && <p className="text-xs text-primary mt-2">{fileText.length} characters extracted</p>}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleProcess} size="lg" className="w-full rounded-xl" disabled={!canProcess || processing}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {processing ? "Saving…" : "Save & process with AI"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
