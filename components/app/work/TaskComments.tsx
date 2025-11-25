// components/app/work/TaskComments.tsx
"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function TaskComments({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [taskId]);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setBody("");
        load(); // Recargar para ver el nuevo
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="p-4 text-xs text-muted-foreground">Cargando comentarios...</div>;

  return (
    <div className="flex flex-col h-full max-h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-4 p-1 min-h-[150px]">
        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
            <MessageSquare className="h-8 w-8 mb-2" />
            <span className="text-xs">Sin comentarios aún</span>
          </div>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 text-sm">
            <Avatar className="h-8 w-8 border">
              <AvatarImage src="" /> {/* Podríamos pasar la imagen si la tuviéramos */}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {c.author.name?.substring(0, 2).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-xs">{c.author.name ?? c.author.email}</span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>
              <div className="bg-muted/40 p-2 rounded-md text-foreground/90 whitespace-pre-wrap">
                {c.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 items-end border-t pt-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un comentario..."
          className="min-h-[60px] resize-none text-xs"
        />
        <Button size="icon" onClick={send} disabled={sending || !body.trim()} className="h-[60px] w-[60px] shrink-0">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}