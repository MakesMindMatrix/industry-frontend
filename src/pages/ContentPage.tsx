import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { getContentBySlug, type ContentItem } from "@/lib/api";

export default function ContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug?.trim()) {
      setLoading(false);
      setError("Content not found");
      return;
    }
    setError("");
    getContentBySlug(slug)
      .then(setItem)
      .catch(() => setError("Content not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="max-w-2xl mx-auto p-6"><p className="text-muted-foreground">Loading…</p></div>;
  if (error || !item) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-destructive">{error || "Not found"}</p>
        <Link to="/content" className="text-primary underline mt-2 inline-block">Back to content</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link to="/content" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to content
      </Link>
      <Card>
        <CardContent className="pt-6">
          {item.title && <h1 className="text-2xl font-bold mb-4">{item.title}</h1>}
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {item.body || "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
