import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getContentList } from "@/lib/api";

export default function ContentList() {
  const [list, setList] = useState<{ id: number; slug: string; title: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContentList()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <FileText className="h-7 w-7" /> Content
      </h1>
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-muted-foreground">No content published yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
            <li key={item.id}>
              <Link to={`/content/${item.slug}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">{item.title || item.slug}</CardTitle>
                  </CardHeader>
                  {item.title && item.slug !== item.title && (
                    <CardContent className="py-0 pb-3 text-sm text-muted-foreground">
                      /{item.slug}
                    </CardContent>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
