// Renders a form schema as interactive inputs. Used for live preview in the
// builder and for real field-visit submissions.
import { Camera, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup, RadioGroupItem,
} from "@/components/ui/radio-group";
import type { FormField } from "@/features/master-data/types";

export type Answers = Record<string, unknown>;

export function FormRenderer({
  schema, answers, onChange, disabled = false,
}: {
  schema: FormField[];
  answers: Answers;
  onChange: (next: Answers) => void;
  disabled?: boolean;
}) {
  const set = (id: string, v: unknown) => onChange({ ...answers, [id]: v });

  if (schema.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        This form has no questions yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {[...schema].sort((a, b) => a.order - b.order).map((field) => (
        <div key={field.id} className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </Label>
          <FieldInput
            field={field}
            value={answers[field.id]}
            onChange={(v) => set(field.id, v)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

function FieldInput({
  field, value, onChange, disabled,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  switch (field.type) {
    case "text":
    case "barcode":
      return (
        <Input
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.type === "barcode" ? "Scan or type barcode" : ""}
        />
      );
    case "number":
      return (
        <Input
          type="number" inputMode="decimal"
          value={(value as string | number | null) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "note":
      return (
        <Textarea
          rows={3}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "yes_no":
      return (
        <RadioGroup
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
          className="flex gap-4"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="yes" id={`${field.id}-yes`} /><Label htmlFor={`${field.id}-yes`}>Yes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="no" id={`${field.id}-no`} /><Label htmlFor={`${field.id}-no`}>No</Label>
          </div>
        </RadioGroup>
      );
    case "select":
      return (
        <Select value={(value as string) ?? ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "multi_select": {
      const current = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          {field.options.length === 0 && (
            <p className="text-xs text-muted-foreground">No options configured.</p>
          )}
          {field.options.map((o) => {
            const checked = current.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(c) => {
                    const next = c ? [...current, o] : current.filter((x) => x !== o);
                    onChange(next);
                  }}
                />
                {o}
              </label>
            );
          })}
        </div>
      );
    }
    case "photo": {
      const data = (value as string | null) ?? null;
      return (
        <div className="space-y-2">
          {data && (
            <img src={data} alt="Captured" className="max-h-48 rounded-md border" />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
            <Camera className="h-4 w-4" />
            {data ? "Retake photo" : "Take / choose photo"}
            <input
              type="file" accept="image/*" capture="environment" className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onChange(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {data && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} disabled={disabled}>
              Remove
            </Button>
          )}
        </div>
      );
    }
    case "gps": {
      const point = value as { lat: number; lng: number; accuracy?: number } | null;
      return (
        <div className="space-y-2">
          {point && (
            <p className="text-sm text-muted-foreground">
              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
              {typeof point.accuracy === "number" && ` (±${Math.round(point.accuracy)}m)`}
            </p>
          )}
          <Button
            type="button" variant="outline" size="sm" disabled={disabled}
            onClick={() => {
              if (!("geolocation" in navigator)) return;
              navigator.geolocation.getCurrentPosition(
                (p) => onChange({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
                () => onChange(null),
                { enableHighAccuracy: true, timeout: 10_000 },
              );
            }}
          >
            <MapPin className="mr-1 h-4 w-4" /> {point ? "Update location" : "Capture GPS"}
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
}

export function validateAnswers(schema: FormField[], answers: Answers): string[] {
  const missing: string[] = [];
  for (const f of schema) {
    if (!f.required) continue;
    const v = answers[f.id];
    const empty =
      v === null || v === undefined || v === "" ||
      (Array.isArray(v) && v.length === 0);
    if (empty) missing.push(f.label);
  }
  return missing;
}
