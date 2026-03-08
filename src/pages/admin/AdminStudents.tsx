import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAdminToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Upload, FileDown, Plus, Pencil, Trash2, LogOut, Loader2, Filter } from "lucide-react";
import {
  getAdminStudents,
  createAdminStudent,
  updateAdminStudent,
  deleteAdminStudent,
  loadAdminStudentsFromCsv,
  uploadAdminStudentsCsv,
  syncAdminFilterOptions,
  clearAdminAuth,
  type StudentIdRow,
} from "@/lib/api";

export default function AdminStudents() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<StudentIdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadCsvLoading, setLoadCsvLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [filterSyncLoading, setFilterSyncLoading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", external_id: "" as string, document_id: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const data = await getAdminStudents();
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
    setForm({ email: "", external_id: "", document_id: "" });
    setError("");
  };

  const handleLoadFromTemp = async () => {
    setLoadCsvLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await loadAdminStudentsFromCsv();
      setMessage(result.message || `Loaded ${result.loaded} rows.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CSV");
    } finally {
      setLoadCsvLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setError("");
    setMessage("");
    try {
      const text = await file.text();
      const result = await uploadAdminStudentsCsv(text);
      setMessage(result.message || `Inserted ${result.loaded} rows.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    } finally {
      setUploadLoading(false);
    }
    e.target.value = "";
  };

  const handleUpdateFilterValues = async () => {
    setFilterSyncLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await syncAdminFilterOptions();
      const c = result.counts;
      setMessage(
        result.message +
          (c
            ? ` Colleges: ${c.colleges}, Branches: ${c.branches}, Specialisations: ${c.specialisations}, Universities: ${c.universities}.`
            : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update filter values");
    } finally {
      setFilterSyncLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createAdminStudent({
        email: form.email.trim(),
        external_id: form.external_id.trim() ? parseInt(form.external_id, 10) : null,
        document_id: form.document_id.trim() || null,
      });
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
      await updateAdminStudent(editing, {
        email: form.email.trim(),
        external_id: form.external_id.trim() ? parseInt(form.external_id, 10) : null,
        document_id: form.document_id.trim() || null,
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this student row?")) return;
    try {
      await deleteAdminStudent(id);
      await load();
      if (editing === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const startEdit = (row: StudentIdRow) => {
    setEditing(row.id);
    setCreating(false);
    setForm({
      email: row.email,
      external_id: row.external_id != null ? String(row.external_id) : "",
      document_id: row.document_id || "",
    });
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
          <Users className="h-7 w-7" /> Student IDs
        </h1>
        <div className="flex gap-2">
          <Link to="/admin/content">
            <Button variant="outline">Content</Button>
          </Link>
          <Link to="/admin/events-contributions">
            <Button variant="outline">Events & Contributions</Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Student IDs are used for AI matching when you run &quot;See AI matches&quot; in Talent Discovery. Load from{" "}
        <code className="bg-muted px-1 rounded">industry-backend-node/temp/student.csv</code> or upload a new CSV (columns: email, id, documentId).
      </p>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 p-2 rounded-md">{message}</p>
      )}

      <Card className="border-muted/80">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Talent Discovery filter dropdowns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Sync colleges, branches, specialisations and universities from Strapi learners into the database. These values are used in the Talent Discovery filters (Industry → Shortlisting). Run this when learner data has changed and you want dropdown options updated.
          </p>
          <Button
            variant="secondary"
            onClick={handleUpdateFilterValues}
            disabled={filterSyncLoading}
            className="gap-2"
          >
            {filterSyncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            {filterSyncLoading ? "Updating…" : "Update filter values"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Load / Upload</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="default"
            onClick={handleLoadFromTemp}
            disabled={loadCsvLoading}
            className="gap-2"
          >
            {loadCsvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Load from temp/student.csv
          </Button>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="gap-2"
            >
              {uploadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload new CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {!creating && !editing && (
        <Button onClick={() => { setCreating(true); setForm({ email: "", external_id: "", document_id: "" }); setError(""); }}>
          <Plus className="h-4 w-4 mr-2" /> Add student
        </Button>
      )}

      {(creating || editing !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>{creating ? "New student" : "Edit student"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={creating ? handleCreate : handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="student@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>External ID (optional)</Label>
                <Input
                  type="number"
                  value={form.external_id}
                  onChange={(e) => setForm((f) => ({ ...f, external_id: e.target.value }))}
                  placeholder="388"
                />
              </div>
              <div className="space-y-2">
                <Label>Document ID (optional)</Label>
                <Input
                  value={form.document_id}
                  onChange={(e) => setForm((f) => ({ ...f, document_id: e.target.value }))}
                  placeholder="p6a3vn7rpo4rczl5lgezxwap"
                />
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
          <CardTitle>All student IDs ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground">No students yet. Load from CSV or add manually.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-2">Email</th>
                    <th className="text-left py-2 pr-2">ID</th>
                    <th className="text-left py-2 pr-2">Document ID</th>
                    <th className="text-left py-2 pr-2">Source</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 pr-2 font-medium">{row.email}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{row.external_id ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground font-mono text-xs">{row.document_id ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{row.source}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
