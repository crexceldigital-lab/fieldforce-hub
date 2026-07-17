// Offline-first product/brand/category service.
// Reads: live-query Dexie (mirror kept fresh by sync-engine).
// Writes: enqueue in outbox, sync-engine replays with optimistic locking.
import { localDB } from "@/features/offline/db";
import { enqueue } from "@/features/offline/outbox";
import { runSync } from "@/features/offline/sync-engine";
import type { Brand, Category, Product } from "@/features/master-data/types";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Reads (cache-backed) ----
export function watchBrands(orgId: string) {
  return () => localDB.brands.where("organization_id").equals(orgId).sortBy("name");
}
export function watchCategories(orgId: string) {
  return () => localDB.categories.where("organization_id").equals(orgId).sortBy("name");
}
export function watchProducts(orgId: string) {
  return () => localDB.products.where("organization_id").equals(orgId).sortBy("name");
}

// ---- Writes (offline-capable) ----
export async function createBrand(orgId: string, name: string): Promise<Brand> {
  const now = new Date().toISOString();
  const row: Brand = { id: uuid(), organization_id: orgId, name: name.trim(), created_at: now };
  await localDB.brands.put(row);
  await enqueue({ entity: "brands", op: "create", organizationId: orgId, targetId: row.id, payload: row as unknown as Record<string, unknown> });
  void runSync(orgId);
  return row;
}
export async function deleteBrand(orgId: string, id: string) {
  await localDB.brands.delete(id);
  await enqueue({ entity: "brands", op: "delete", organizationId: orgId, targetId: id, payload: {} });
  void runSync(orgId);
}

export async function createCategory(orgId: string, name: string): Promise<Category> {
  const now = new Date().toISOString();
  const row: Category = { id: uuid(), organization_id: orgId, name: name.trim(), created_at: now };
  await localDB.categories.put(row);
  await enqueue({ entity: "categories", op: "create", organizationId: orgId, targetId: row.id, payload: row as unknown as Record<string, unknown> });
  void runSync(orgId);
  return row;
}
export async function deleteCategory(orgId: string, id: string) {
  await localDB.categories.delete(id);
  await enqueue({ entity: "categories", op: "delete", organizationId: orgId, targetId: id, payload: {} });
  void runSync(orgId);
}

export type ProductInput = {
  name: string;
  brand_id: string | null;
  category_id: string | null;
  sku: string | null;
  barcode: string | null;
  unit_price: number | null;
  package_size: string | null;
  is_active: boolean;
  is_competitor: boolean;
};

export async function createProduct(orgId: string, input: ProductInput): Promise<Product> {
  const now = new Date().toISOString();
  const row: Product = {
    id: uuid(),
    organization_id: orgId,
    image_url: null,
    created_at: now,
    updated_at: now,
    ...input,
  };
  await localDB.products.put(row);
  await enqueue({ entity: "products", op: "create", organizationId: orgId, targetId: row.id, payload: row as unknown as Record<string, unknown> });
  void runSync(orgId);
  return row;
}

export async function updateProduct(orgId: string, id: string, patch: Partial<ProductInput>) {
  const existing = await localDB.products.get(id);
  const baseUpdatedAt = existing?.updated_at ?? null;
  const now = new Date().toISOString();
  if (existing) await localDB.products.put({ ...existing, ...patch, updated_at: now });
  await enqueue({
    entity: "products", op: "update", organizationId: orgId, targetId: id,
    payload: patch as Record<string, unknown>, baseUpdatedAt,
  });
  void runSync(orgId);
}

export async function toggleProductActive(orgId: string, id: string, isActive: boolean) {
  await updateProduct(orgId, id, { is_active: isActive });
}

export async function deleteProduct(orgId: string, id: string) {
  await localDB.products.delete(id);
  await enqueue({ entity: "products", op: "delete", organizationId: orgId, targetId: id, payload: {} });
  void runSync(orgId);
}
