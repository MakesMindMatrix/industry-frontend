import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  FileText,
  Key,
  Loader2,
  Copy,
  Check,
  Paperclip,
  X,
  Send,
  Pencil,
  CheckCircle,
  FileEdit,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchJdSuggestions, fetchJdGenerateStream, getMyJDs, createJD, updateJD, getJD, type JDDraft } from "@/lib/api";
import { cleanJdText, readFileAsText } from "@/lib/jdUtils";

type Suggestions = { roles?: string[]; skills?: string[]; experience?: string[] };
type AttachedFile = { file: File; name: string; extractedText: string; error?: string };

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      streaming?: boolean;
      jd?: string;
      title?: string;
      questions?: string[];
      addonSuggestions?: string[];
    };

type JdPanel = { title: string; jd: string };
type JdStatus = "draft" | "approved";

export default function JDCreate() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  const [jdPanel, setJdPanel] = useState<JdPanel | null>(null);
  const [jdStatus, setJdStatus] = useState<JdStatus>("draft");
  const [editingJd, setEditingJd] = useState(false);
  const [editDraft, setEditDraft] = useState<JdPanel>({ title: "", jd: "" });
  const [drafts, setDrafts] = useState<JDDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [savingApprove, setSavingApprove] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [jdListFilter, setJdListFilter] = useState<"all" | "saved" | "draft">("all");
  const [myJdsExpanded, setMyJdsExpanded] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showJdPanel = jdPanel !== null || (loading && messages.some((m) => m.role === "assistant" && m.streaming));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchJdSuggestions()
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, []);

  useEffect(() => {
    getMyJDs()
      .then(setDrafts)
      .catch(() => {})
      .finally(() => setDraftsLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (loading) setMyJdsExpanded(false);
  }, [loading]);

  const MIN_INPUT_HEIGHT = 44;
  const MAX_INPUT_HEIGHT = 120;

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const h = Math.min(Math.max(ta.scrollHeight, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
    ta.style.height = `${h}px`;
  }, [input]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) {
      setErrorMessage("Type a message or attach a file.");
      return;
    }
    setErrorMessage(null);
    setInput("");

    const userContent = trimmed || (attachments.length ? "I've attached a document." : "");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: userContent };
    setMessages((prev) => [...prev, userMsg]);

    const prevUserContents = messages.filter((m): m is ChatMessage & { role: "user" } => m.role === "user").map((m) => m.content);
    const allUserContents = [...prevUserContents, trimmed];
    const attachmentText = attachments
      .filter((a) => a.extractedText)
      .map((a) => `--- Content from ${a.name} ---\n\n${a.extractedText}`)
      .join("\n\n");
    const prompt = allUserContents.length ? [allUserContents[0], attachmentText].filter(Boolean).join("\n\n") : attachmentText;
    const answers = allUserContents.slice(1);
    const fullPrompt = [prompt, ...answers].filter(Boolean).join("\n\n");
    if (!fullPrompt.trim()) {
      setErrorMessage("Enter a role description or attach a file.");
      return;
    }

    setLoading(true);
    setApiKeyMissing(false);
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true, questions: [] },
    ]);

    const updateAssistant = (patch: Partial<Extract<ChatMessage, { role: "assistant" }>>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, ...patch } : m))
      );
    };

    try {
      await fetchJdGenerateStream(
        { prompt, answers, useCache: true },
        {
          onChunk: (chunk) => {
            updateAssistant((m) => ({ content: (m.content || "") + chunk }));
          },
          onDone: (data) => {
            const jd = data.jd ? cleanJdText(data.jd) : undefined;
            if (jd) {
              setJdPanel({ title: data.title || "Job Description", jd });
              setJdStatus("draft");
            }
            updateAssistant({
              streaming: false,
              content: data.questions?.length ? data.questions.join("\n\n") : (jd ? "" : ""),
              jd,
              title: data.title,
              questions: data.questions,
              addonSuggestions: data.addonSuggestions,
            });
          },
          onError: (msg) => {
            const str = typeof msg === "string" ? msg : (msg?.message && typeof msg.message === "string" ? msg.message : String(msg));
            const keyMissing = str.includes("GEMINI_API_KEY") || str.includes("not configured");
            setApiKeyMissing(keyMissing);
            setErrorMessage(keyMissing ? "" : str);
            setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          },
        }
      );
    } catch (e) {
      const err = e as Error;
      setErrorMessage(err?.message || "Request failed");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    sendMessage(input);
  };

  const addSuggestion = (text: string) => {
    setInput((prev) => (prev ? `${prev}, ${text}` : text));
    inputRef.current?.focus();
  };

  const copyJd = () => {
    if (jdPanel?.jd) {
      navigator.clipboard.writeText(jdPanel.jd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startEditJd = () => {
    if (jdPanel) {
      setEditDraft({ title: jdPanel.title, jd: jdPanel.jd });
      setEditingJd(true);
    }
  };

  const saveEditJd = () => {
    setJdPanel({ title: editDraft.title.trim() || "Job Description", jd: editDraft.jd.trim() });
    setEditingJd(false);
  };

  const handleApprove = async () => {
    if (jdStatus === "approved") {
      setJdStatus("draft");
      setApproveError(null);
      return;
    }
    if (!jdPanel?.jd?.trim()) {
      setApproveError("Add some content to the JD before approving.");
      return;
    }
    setApproveError(null);
    const title = (jdPanel.title || "Untitled JD").trim();
    const jdText = jdPanel.jd.trim();
    setSavingApprove(true);
    try {
      let savedId: number;
      if (currentDraftId) {
        await updateJD(currentDraftId, { title, jd: jdText, status: "published" });
        savedId = currentDraftId;
        setDrafts((prev) => prev.map((d) => (d.id === currentDraftId ? { ...d, title, jd: jdText, status: "published" } : d)));
      } else {
        const created = await createJD({ title, jd: jdText, status: "published" });
        savedId = created.id;
        setCurrentDraftId(savedId);
        setDrafts((prev) => [{ ...created, title, jd: jdText, status: "published" }, ...prev]);
      }
      setJdStatus("approved");
      navigate("/industry/competency", {
        state: {
          fromJd: { title, jd: jdText },
          selectedJdId: savedId,
          savedJd: { id: savedId, title, status: "published", createdAt: undefined, updatedAt: undefined },
        },
      });
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Failed to save JD");
    } finally {
      setSavingApprove(false);
    }
  };

  const cancelEditJd = () => {
    setEditingJd(false);
  };

  const saveAsDraft = async () => {
    if (!jdPanel?.jd?.trim()) return;
    setSavingDraft(true);
    try {
      const title = "Draft";
      if (currentDraftId) {
        await updateJD(currentDraftId, { title, jd: jdPanel.jd, status: "draft" });
        setDrafts((prev) => prev.map((d) => (d.id === currentDraftId ? { ...d, title, jd: jdPanel.jd, status: "draft" } : d)));
      } else {
        const created = await createJD({ title, jd: jdPanel.jd, status: "draft" });
        setCurrentDraftId(created.id);
        setDrafts((prev) => [{ ...created, title, jd: jdPanel.jd, status: "draft" }, ...prev]);
      }
    } catch (_) {}
    finally {
      setSavingDraft(false);
    }
  };

  const loadDraft = async (id: number) => {
    try {
      const jd = await getJD(id);
      setJdPanel({ title: jd.title || "Job Description", jd: jd.jd || "" });
      setCurrentDraftId(id);
      setJdStatus("draft");
    } catch (_) {}
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const extractedText = await readFileAsText(file);
        setAttachments((prev) => [...prev, { file, name: file.name, extractedText }]);
      } catch (err) {
        setAttachments((prev) => [...prev, { file, name: file.name, extractedText: "", error: (err as Error).message }]);
      }
    }
    e.target.value = "";
  };

  const removeAttachment = (index: number) => setAttachments((prev) => prev.filter((_, i) => i !== index));

  const formatJdDate = (d: JDDraft) => {
    const raw = d.updatedAt || d.createdAt;
    if (!raw) return "";
    try {
      return new Date(raw).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  const filteredDrafts = drafts.filter((d) => {
    if (jdListFilter === "saved") return d.status === "published";
    if (jdListFilter === "draft") return d.status === "draft";
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-2 shrink-0">
        <h2 className="text-2xl font-bold text-foreground">AI JD Builder</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Chat to create a job description. The JD appears on the right when generation starts. Approve to take it to Competency Matrix.
        </p>
        <div className="mt-3 border border-border/60 rounded-lg bg-muted/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setMyJdsExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              {myJdsExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              My JDs
              <span className="text-muted-foreground font-normal">({drafts.length})</span>
            </span>
          </button>
          {myJdsExpanded && (
            <div className="border-t border-border/60 px-3 py-2 space-y-2 bg-background/50">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={jdListFilter === "all" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setJdListFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={jdListFilter === "saved" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setJdListFilter("saved")}
                >
                  Saved
                </Button>
                <Button
                  variant={jdListFilter === "draft" ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setJdListFilter("draft")}
                >
                  Draft
                </Button>
              </div>
              <div className="min-h-0 overflow-x-auto overflow-y-hidden rounded-md border border-border/40 bg-muted/30 max-h-[88px]">
                {draftsLoading ? (
                  <div className="p-2 flex items-center justify-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </div>
                ) : filteredDrafts.length === 0 ? (
                  <div className="p-2 text-muted-foreground text-xs">No JDs in this filter.</div>
                ) : (
                  <ul className="p-1.5 flex gap-1.5 flex-wrap">
                    {filteredDrafts.map((d) => (
                      <li key={d.id} className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => loadDraft(d.id)}
                          className={`rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5 border ${
                            currentDraftId === d.id ? "bg-primary/15 text-foreground border-primary/30" : "hover:bg-muted/70 border-transparent"
                          }`}
                        >
                          <span className="truncate max-w-[120px]">{d.title || (d.status === "draft" ? "Draft" : `JD #${d.id}`)}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatJdDate(d) || "—"}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 shrink-0 p-0"
                          title="Open Competency Matrix"
                          onClick={() =>
                            navigate("/industry/competency", {
                              state: {
                                selectedJdId: d.id,
                                savedJd: {
                                  id: d.id,
                                  title: d.title,
                                  status: d.status,
                                  createdAt: d.createdAt,
                                  updatedAt: d.updatedAt,
                                },
                              },
                            })
                          }
                        >
                          <LayoutGrid className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {apiKeyMissing && (
        <Card className="border-amber-500/50 bg-amber-500/5 mb-4">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <Key className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Gemini API key not set</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add <code className="bg-muted px-1 rounded">GEMINI_API_KEY</code> to the backend .env. Get a key at{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Google AI Studio
                </a>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={`flex-1 min-h-0 flex flex-col ${showJdPanel ? "lg:grid lg:grid-cols-[1fr_minmax(320px,40%)] lg:gap-4" : ""}`}>
        {/* Chat (left or full width) — fills height, input bar at bottom */}
        <div className="flex flex-col min-h-0 flex-1 rounded-2xl border border-border/80 bg-gradient-to-b from-muted/30 to-muted/10 shadow-sm overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary mb-5 ring-2 ring-primary/10">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">AI JD Builder</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">Create polished job descriptions in minutes. Describe the role, skills, experience level, or paste an existing JD—I&apos;ll refine it into a professional, structured format.
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Tip: Include start date, location, or team size if relevant. Your JD will appear in the panel on the right as it&apos;s generated.</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/60 rounded-bl-md text-foreground"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <div className="text-sm">
                      {m.streaming && (
                        <pre className="whitespace-pre-wrap font-sans text-foreground overflow-x-auto">{m.content || "…"}</pre>
                      )}
                      {!m.streaming && Array.isArray(m.questions) && m.questions.length > 0 ? (
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">A few more details:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            {m.questions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {!m.streaming && m.jd ? (
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Your JD is ready. Check the panel on the right.</p>
                          {Array.isArray(m.addonSuggestions) && m.addonSuggestions.length > 0 && (
                            <>
                              <p className="text-muted-foreground text-xs mt-2">Shall I add any of these?</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {m.addonSuggestions.map((s, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-primary/20 text-xs font-normal"
                                    onClick={() => addSuggestion(s)}
                                  >
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}
                      {!m.streaming && !m.questions?.length && !m.jd && m.content ? (
                        <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-card border border-border/60 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border/60 p-4 pb-4 bg-background/90 rounded-b-2xl shrink-0">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((a, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    <FileText className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{a.name}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="ml-0.5 hover:bg-muted rounded p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {!loadingSuggestions && (suggestions.roles?.length || suggestions.skills?.length || suggestions.experience?.length) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[...(suggestions.roles || []).slice(0, 4), ...(suggestions.skills || []).slice(0, 4), ...(suggestions.experience || [])].map((s) => (
                  <Badge key={s} variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs" onClick={() => addSuggestion(s)}>
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 items-end w-full">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                className="hidden"
                onChange={onFileSelect}
              />
              <Button type="button" variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the role, start date, location…"
                className="min-h-[44px] max-h-[120px] resize-none overflow-y-auto py-3 px-3 w-full text-base leading-relaxed"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button type="submit" size="icon" className="shrink-0 h-10 w-10" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
            {errorMessage && <p className="text-sm text-destructive mt-2">{errorMessage}</p>}
          </div>
        </div>

        {/* Right: JD panel (only when JD generation started or JD exists) */}
        {showJdPanel && (
          <Card className="flex flex-col min-h-0 border-primary/20 bg-muted/10 lg:min-w-0">
            <CardContent className="flex flex-col flex-1 min-h-0 p-4">
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                <span className="font-semibold text-foreground">Generated JD</span>
                {jdPanel && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={copyJd}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    {!editingJd && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={saveAsDraft}
                          disabled={savingDraft || !jdPanel.jd?.trim()}
                        >
                          {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                          {savingDraft ? "Saving…" : "Save as draft"}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={startEditJd}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={handleApprove}
                          disabled={savingDraft || !jdPanel.jd?.trim()}
                        >
                          {savingDraft ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : jdStatus === "approved" ? (
                            <FileEdit className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                          {savingDraft ? "Saving…" : jdStatus === "approved" ? "Move to draft" : "Approve"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {jdStatus === "approved" && jdPanel && (
                <Badge className="w-fit mb-2 bg-green-600">Approved</Badge>
              )}
              {approveError && (
                <p className="text-sm text-destructive mb-2" role="alert">{approveError}</p>
              )}
              {!jdPanel ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm rounded-lg border border-dashed p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Generating JD…
                </div>
              ) : editingJd ? (
                <div className="flex flex-col gap-3 flex-1 min-h-0">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Title</label>
                    <input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm"
                      placeholder="Job title"
                    />
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col">
                    <label className="text-xs font-medium text-muted-foreground">Job description</label>
                    <Textarea
                      value={editDraft.jd}
                      onChange={(e) => setEditDraft((d) => ({ ...d, jd: e.target.value }))}
                      className="mt-1 flex-1 min-h-[200px] resize-y font-sans text-sm"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={saveEditJd}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEditJd}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <p className="font-medium text-foreground mb-2">{jdPanel.title}</p>
                  <pre className="whitespace-pre-wrap text-sm font-sans text-foreground">{jdPanel.jd}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
