import { db } from "@/integrations/supabase/db";
import type { Brand, Category, Product } from "@/features/master-data/types";

export async function fetchBrands(orgId: string): Promise<Brand[]> {
  const { data, error } = await db.from("brands").select("*").eq("organization_id", orgId).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createBrand(orgId: string, name: string) {
  const { data, error } = await db
    .from("brands")
    .insert({ organization_id: orgId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Brand;
}

export async function deleteBrand(id: string) {
  const { error } = await db.from("brands").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCategories(orgId: string): Promise<Category[]> {
  const { data, error } = await db.from("categories").select("*").eq("organization_id", orgId).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(orgId: string, name: string) {
  const { data, error } = await db
    .from("categories")
    .insert({ organization_id: orgId, name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchProducts(orgId: string): Promise<Product[]> {
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data ?? [];
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

export async function createProduct(orgId: string, input: ProductInput) {
  const { error } = await db.from("products").insert({ organization_id: orgId, ...input });
  if (error) throw error;
}

export async function updateProduct(id: string, input: ProductInput) {
  const { error } = await db.from("products").update(input).eq("id", id);
  if (error) throw error;
}

export async function toggleProductActive(id: string, isActive: boolean) {
  const { error } = await db.from("products").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw error;
}
