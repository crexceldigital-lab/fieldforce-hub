import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { AppShell } from "@/features/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StoreRow, TimelineEvent } from "@/features/master-data/types";
import { watchStore, watchTimeline } from "./service";

const EVENT_TONE: Record<string, string> = {
  store_created: "bg-emerald-100 text-emerald-800",
  store_updated: "bg-blue-100 text-blue-800",
  visit: "bg-violet-100 text-violet-800",
  audit: "bg-amber-100 text-amber-800",
  order: "bg-teal-100 text-teal-800",
  issue: "bg-red-100 text-red-800",
};

export function StoreTimelinePage() {
  const { storeId } = useParams({ from: "/_authenticated/app/stores/$storeId/timeline" });
  const store = useLiveQuery(watchStore(storeId), [storeId]) as StoreRow | undefined;
  const events = (useLiveQuery(watchTimeline(storeId), [storeId]) ?? []) as TimelineEvent[];

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex flex-wrap items-center gap-3 px-6 py-5 md:px-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/stores/$storeId" params={{ storeId }}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Timeline · {store?.name ?? "…"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every recorded activity for this store. Works offline — new events appear as soon as they sync.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No history yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Visits, audits, orders, and issues will appear here in real time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {events.length} event{events.length === 1 ? "" : "s"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-6">
                {events.map((ev) => <TimelineItem key={ev.id} ev={ev} />)}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function TimelineItem({ ev }: { ev: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const tone = EVENT_TONE[ev.event_type] ?? "bg-muted text-muted-foreground";
  const hasMetadata = ev.metadata && Object.keys(ev.metadata).length > 0;

  return (
    <li className="relative">
      <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`border-0 ${tone}`}>
          {ev.event_type.replace(/_/g, " ")}
        </Badge>
        <p className="text-sm font-medium">{ev.title}</p>
        <p className="ml-auto text-xs text-muted-foreground">
          {new Date(ev.created_at).toLocaleString()}
        </p>
      </div>
      {ev.description && (
        <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>
      )}
      {hasMetadata && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {open ? "Hide details" : "Show details"}
        </button>
      )}
      {open && hasMetadata && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted/60 p-3 text-xs">
          {JSON.stringify(ev.metadata, null, 2)}
        </pre>
      )}
    </li>
  );
}
