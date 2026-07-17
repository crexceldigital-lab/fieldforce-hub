export type TerritoryLevel = "country" | "region" | "district" | "ward" | "route";

export const TERRITORY_LEVELS: TerritoryLevel[] = [
  "country",
  "region",
  "district",
  "ward",
  "route",
];

export function nextLevel(level: TerritoryLevel): TerritoryLevel | null {
  const i = TERRITORY_LEVELS.indexOf(level);
  return i >= 0 && i < TERRITORY_LEVELS.length - 1 ? TERRITORY_LEVELS[i + 1] : null;
}

export interface Territory {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  level: TerritoryLevel;
  created_at: string;
  updated_at: string;
}

export interface TerritoryNode extends Territory {
  children: TerritoryNode[];
}

export interface TerritoryAssignment {
  id: string;
  organization_id: string;
  user_id: string;
  territory_id: string;
  created_at: string;
}

export interface Brand {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  brand_id: string | null;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_price: number | null;
  package_size: string | null;
  image_url: string | null;
  is_active: boolean;
  is_competitor: boolean;
  created_at: string;
  updated_at: string;
}

export type StoreChannel = "modern_trade" | "traditional_trade" | "wholesale" | "kiosk";
export type StoreTier = "gold" | "silver" | "bronze" | "unclassified";

export const STORE_CHANNELS: { value: StoreChannel; label: string }[] = [
  { value: "modern_trade", label: "Modern Trade" },
  { value: "traditional_trade", label: "Traditional Trade" },
  { value: "wholesale", label: "Wholesale" },
  { value: "kiosk", label: "Kiosk" },
];

export const STORE_TIERS: { value: StoreTier; label: string }[] = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "unclassified", label: "Unclassified" },
];

export interface StoreRow {
  id: string;
  organization_id: string;
  route_id: string | null;
  name: string;
  owner_name: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  channel: StoreChannel;
  tier: StoreTier;
  credit_status: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  organization_id: string;
  store_id: string;
  event_type: string;
  title: string;
  description: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrgMember {
  userId: string;
  fullName: string | null;
  email: string | null;
  roles: { id: string; name: string; userRoleId: string }[];
}

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignStore {
  id: string;
  organization_id: string;
  campaign_id: string;
  store_id: string;
  created_at: string;
}

export interface CampaignForm {
  id: string;
  organization_id: string;
  campaign_id: string;
  form_id: string;
  created_at: string;
}

export type FormStatus = "draft" | "published" | "archived";

export const FORM_STATUSES: { value: FormStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export type FormFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "yes_no"
  | "note"
  | "photo"
  | "barcode"
  | "gps";

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "yes_no", label: "Yes / No" },
  { value: "note", label: "Note" },
  { value: "photo", label: "Photo" },
  { value: "barcode", label: "Barcode" },
  { value: "gps", label: "GPS point" },
];

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options: string[];
  order: number;
}

export interface Form {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: FormStatus;
  schema: FormField[];
  version: number;
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus = "draft" | "submitted" | "synced";

export interface FormSubmission {
  id: string;
  organization_id: string;
  form_id: string;
  campaign_id: string | null;
  store_id: string;
  submitted_by: string;
  submitted_at: string;
  answers: Record<string, unknown>;
  photos: Record<string, unknown> | null;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}
