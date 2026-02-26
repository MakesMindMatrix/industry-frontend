import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAdminToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Pencil, Trash2, LogOut } from "lucide-react";
import {
  getAdminContentList,
  createContent,
  updateContent,
  deleteContent,
  clearAdminAuth,
  type ContentItem,
} from "@/lib/api";

export default function AdminContent() {
  const navigate = useNavigate();
  const [list, setList] = useState<(ContentItem & { published?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await getAdminContentList();
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login", { replace: true });
      return;
    }
    load();
  }, [navigate]);

  const resetForm = () => {
    setEditing(null);
    setCreating(false);
    setSlug("");
    setTitle("");
    setBody("");
    setPublished(true);
    setError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createContent({ slug: slug.trim(), title: title.trim() || undefined, body: body || undefined, published });
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing == null) return;
    setSaving(true);
    setError("");
    try {
      await updateContent(editing, { slug: slug.trim(), title: title.trim() || undefined, body: body || undefined, published });
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this content?")) return;
    try {
      await deleteContent(id);
      await load();
      if (editing === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const startEdit = (item: ContentItem & { published?: boolean }) => {
    setEditing(item.id);
    setCreating(false);
    setSlug(item.slug);
    setTitle(item.title || "");
    setBody(item.body || "");
    setPublished(item.published ?? true);
    setError("");
  };

  const handleLogout = () => {
    clearAdminAuth();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7" /> Content management
        </h1>
        <div className="flex gap-2">
          <Link to="/admin/students">
            <Button variant="outline">Student IDs</Button>
          </Link>
          <Link to="/admin/events-contributions">
            <Button variant="outline">Events & Contributions</Button>
          </Link>
          <Link to="/content">
            <Button variant="outline">View public content</Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}

      {!creating && !editing && (
        <Button onClick={() => { setCreating(true); setSlug(""); setTitle(""); setBody(""); setPublished(true); setError(""); }}>
          <Plus className="h-4 w-4 mr-2" /> New content
        </Button>
      )}

      {(creating || editing !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{creating ? "New content" : "Edit content"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={creating ? handleCreate : handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Slug (URL path)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="about-us" required disabled={!!editing} />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="About us" />
              </div>
              <div className="space-y-2">
                <Label>Body (plain text or markdown)</Label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Content body…"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pub" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                <Label htmlFor="pub">Published</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All content</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground">No content yet. Create one above.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((item) => (
                <li key={item.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="font-medium">{item.slug}</span>
                    {item.title && <span className="text-muted-foreground ml-2">— {item.title}</span>}
                    {!item.published && <span className="text-amber-600 text-sm ml-2">(draft)</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Link to={`/content/${item.slug}`} target="_blank">
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
