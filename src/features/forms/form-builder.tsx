import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FormField, FormFieldType, FormInput } from "@/features/master-data/types";
import { FORM_FIELD_TYPES } from "@/features/master-data/types";
import { nextFieldOrder } from "./service";

export function FormBuilder({
  value, onChange,
}: {
  value: FormInput;
  onChange: (input: FormInput) => void;
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const set = (patch: Partial<FormInput>) => onChange({ ...value, ...patch });

  const addField = () => {
    const field: FormField = {
      id: crypto.randomUUID(),
      type: "text",
      label: "New question",
      required: false,
      options: [],
      order: nextFieldOrder(value.schema),
    };
    const next = [...value.schema, field];
    onChange({ ...value, schema: next });
    setActiveFieldId(field.id);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    const next = value.schema.map((f) => (f.id === id ? { ...f, ...patch } : f));
    onChange({ ...value, schema: next });
  };

  const removeField = (id: string) => {
    const next = value.schema.filter((f) => f.id !== id);
    onChange({ ...value, schema: next });
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const moveField = (id: string, direction: -1 | 1) => {
    const idx = value.schema.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= value.schema.length) return;
    const next = [...value.schema];
    const [moved] = next.splice(idx, 1);
    next.splice(newIdx, 0, moved);
    onChange({ ...value, schema: next.map((f, i) => ({ ...f, order: i + 1 })) });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Form name</Label>
          <Input
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="e.g., Availability & Price Audit"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={value.description ?? ""}
            onChange={(e) => set({ description: e.target.value || null })}
            placeholder="What this form collects and when to use it."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={value.status} onValueChange={(v) => set({ status: v as FormInput["status"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Questions</h3>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="mr-1 h-4 w-4" /> Add question
          </Button>
        </div>

        {value.schema.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">No questions yet. Add the first one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {value.schema.map((field, idx) => (
              <div
                key={field.id}
                className={`rounded-lg border bg-card p-3 ${activeFieldId === field.id ? "ring-1 ring-primary" : ""}`}
                onClick={() => setActiveFieldId(field.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex flex-col gap-1">
                    <Button
                      type="button" variant="ghost" size="icon" className="h-6 w-6"
                      disabled={idx === 0} onClick={() => moveField(field.id, -1)}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Question label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          placeholder="e.g., Is the product on shelf?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(v) => updateField(field.id, { type: v as FormFieldType })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FORM_FIELD_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {(field.type === "select" || field.type === "multi_select") && (
                      <div className="space-y-2">
                        <Label className="text-xs">Options (comma separated)</Label>
                        <Input
                          value={field.options.join(", ")}
                          onChange={(e) => updateField(field.id, {
                            options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })}
                          placeholder="Yes, No, Partially"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`required-${field.id}`}
                          checked={field.required}
                          onCheckedChange={(v) => updateField(field.id, { required: v })}
                        />
                        <Label htmlFor={`required-${field.id}`} className="text-xs font-normal">Required</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      disabled={idx === value.schema.length - 1}
                      onClick={() => moveField(field.id, 1)}
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
