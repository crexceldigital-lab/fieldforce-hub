import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext, usePermission } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Form } from "@/features/master-data/types";
import { FORM_STATUSES } from "@/features/master-data/types";
import { createForm, deleteForm, updateForm, watchForms, type FormInput } from "./service";
import { FormBuilder } from "./form-builder";

export function FormsPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("campaigns.manage");

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Form | "new" | null>(null);

  const forms = useLiveQuery(
    orgId ? watchForms(orgId) : () => [],
    [orgId], [] as Form[],
  ) ?? [];

  const filtered = forms.filter((f) => {
    const q = search.trim().toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q);
  });

  const statusLabel = (value: string) => FORM_STATUSES.find((s) => s.value === value)?.label ?? value;
  const statusVariant = (value: string) => {
    if (value === "published") return "default";
    if (value === "archived") return "secondary";
    return "outline";
  };

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Forms</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build reusable data collection forms for audits, stock checks, and surveys.
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="mr-1 h-4 w-4" /> New form
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search forms…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="ml-auto text-sm text-muted-foreground">
            {filtered.length} of {forms.length} forms
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No forms yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a form to collect structured data in the field.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-muted-foreground">{f.description ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(f.status) as never}>{statusLabel(f.status)}</Badge>
                    </TableCell>
                    <TableCell>{f.schema?.length ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setEditing(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <DeleteButton form={f} orgId={orgId!} />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && orgId && (
        <FormDialog
          orgId={orgId}
          form={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
}

function DeleteButton({ form, orgId }: { form: Form; orgId: string }) {
  const deleteMut = useMutation({
    mutationFn: () => deleteForm(orgId, form.id),
    onSuccess: () => toast.success("Form deleted"),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      variant="ghost" size="icon"
      onClick={() => { if (confirm(`Delete "${form.name}"?`)) deleteMut.mutate(); }}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

function FormDialog({
  orgId, form, onClose,
}: {
  orgId: string;
  form: Form | null;
  onClose: () => void;
}) {
  const [input, setInput] = useState<FormInput>({
    name: form?.name ?? "",
    description: form?.description ?? null,
    status: form?.status ?? "draft",
    schema: form?.schema ?? [],
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (form) await updateForm(orgId, form.id, input);
      else await createForm(orgId, input);
    },
    onSuccess: () => {
      toast.success(form ? "Form updated" : "Form created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form ? "Edit form" : "New form"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="build" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-1 h-4 w-4" /> Live preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="build">
            <FormBuilder value={input} onChange={setInput} />
          </TabsContent>
          <TabsContent value="preview">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3">
                <h3 className="text-lg font-semibold">{input.name || "Untitled form"}</h3>
                {input.description && (
                  <p className="text-sm text-muted-foreground">{input.description}</p>
                )}
              </div>
              <FormRenderer
                schema={input.schema}
                answers={previewAnswers}
                onChange={setPreviewAnswers}
              />
              <p className="mt-4 text-xs text-muted-foreground">
                This is a live preview — nothing is saved until you press "{form ? "Save changes" : "Create form"}".
              </p>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!input.name.trim() || saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {form ? "Save changes" : "Create form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
