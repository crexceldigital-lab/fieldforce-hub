import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { Package, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/features/shell/app-shell";
import { useCurrentContext, usePermission } from "@/features/auth/use-current-org";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Brand, Category, Product } from "@/features/master-data/types";
import {
  createBrand, createCategory, createProduct, deleteBrand, deleteCategory,
  deleteProduct, toggleProductActive, updateProduct, watchBrands, watchCategories,
  watchProducts, type ProductInput,
} from "./service";

const NONE = "__none__";

export function ProductsPage() {
  const { data: ctx } = useCurrentContext();
  const orgId = ctx?.organizationId ?? null;
  const canManage = usePermission("products.manage");

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [tab, setTab] = useState<"all" | "own" | "competitor">("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [listManager, setListManager] = useState<"brands" | "categories" | null>(null);

  const brands = useLiveQuery(orgId ? watchBrands(orgId) : () => [], [orgId], [] as Brand[]) ?? [];
  const categories = useLiveQuery(orgId ? watchCategories(orgId) : () => [], [orgId], [] as Category[]) ?? [];
  const products = useLiveQuery(orgId ? watchProducts(orgId) : () => [], [orgId], [] as Product[]) ?? [];

  const brandName = (id: string | null) => brands.find((b) => b.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; active: boolean }) =>
      toggleProductActive(orgId!, vars.id, vars.active),
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(orgId!, id),
    onSuccess: () => toast.success("Product deleted (offline-safe)"),
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (tab === "own" && p.is_competitor) return false;
      if (tab === "competitor" && !p.is_competitor) return false;
      if (brandFilter !== "all" && p.brand_id !== brandFilter) return false;
      if (q && !`${p.name} ${p.sku ?? ""} ${p.barcode ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, brandFilter, tab]);

  return (
    <AppShell>
      <div className="border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The catalog powering audits, availability, and (soon) orders.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setListManager("brands")}>
                <Tags className="mr-1 h-4 w-4" /> Brands
              </Button>
              <Button variant="outline" onClick={() => setListManager("categories")}>
                <Tags className="mr-1 h-4 w-4" /> Categories
              </Button>
              <Button onClick={() => setEditing("new")}>
                <Plus className="mr-1 h-4 w-4" /> Add product
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search name, SKU, barcode…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="own">Our products</TabsTrigger>
              <TabsTrigger value="competitor">Competitors</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="ml-auto text-sm text-muted-foreground">
            {filtered.length} of {products.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-12 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No products found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length
                ? "Adjust your filters."
                : "Add your SKUs and competitor products to power audits."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Price (TZS)</TableHead>
                  <TableHead>Active</TableHead>
                  {canManage && <TableHead className="w-[90px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.is_competitor && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">Competitor</Badge>
                      )}
                    </TableCell>
                    <TableCell>{brandName(p.brand_id)}</TableCell>
                    <TableCell>{categoryName(p.category_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.package_size ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {p.unit_price != null ? Number(p.unit_price).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.is_active}
                        disabled={!canManage}
                        onCheckedChange={(v) => toggleMut.mutate({ id: p.id, active: v })}
                      />
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMut.mutate(p.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && orgId && (
        <ProductDialog
          orgId={orgId}
          product={editing === "new" ? null : editing}
          brands={brands}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {listManager && orgId && (
        <ListManagerDialog
          kind={listManager}
          orgId={orgId}
          brands={brands}
          categories={categories}
          onClose={() => setListManager(null)}
        />
      )}
    </AppShell>
  );
}

function ProductDialog({
  orgId, product, brands, categories, onClose, onSaved,
}: {
  orgId: string;
  product: Product | null;
  brands: Brand[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? "",
    brand_id: product?.brand_id ?? null,
    category_id: product?.category_id ?? null,
    sku: product?.sku ?? null,
    barcode: product?.barcode ?? null,
    unit_price: product?.unit_price != null ? Number(product.unit_price) : null,
    package_size: product?.package_size ?? null,
    is_active: product?.is_active ?? true,
    is_competitor: product?.is_competitor ?? false,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (product) await updateProduct(orgId, product.id, form);
      else await createProduct(orgId, form);
    },
    onSuccess: () => { toast.success(product ? "Product updated" : "Product created"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="MO Cola 300ml" />
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={form.brand_id ?? NONE} onValueChange={(v) => set("brand_id", v === NONE ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category_id ?? NONE} onValueChange={(v) => set("category_id", v === NONE ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <Label>Barcode</Label>
            <Input value={form.barcode ?? ""} onChange={(e) => set("barcode", e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <Label>Unit price (TZS)</Label>
            <Input
              type="number" min="0" step="0.01"
              value={form.unit_price ?? ""}
              onChange={(e) => set("unit_price", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Package size</Label>
            <Input
              value={form.package_size ?? ""} placeholder="300ml / 24-pack"
              onChange={(e) => set("package_size", e.target.value || null)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Competitor product</p>
              <p className="text-xs text-muted-foreground">Tracked for competitor intelligence, not sold by you.</p>
            </div>
            <Switch checked={form.is_competitor} onCheckedChange={(v) => set("is_competitor", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.name.trim() || saveMut.isPending} onClick={() => saveMut.mutate()}>
            {product ? "Save changes" : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListManagerDialog({
  kind, orgId, brands, categories, onClose,
}: {
  kind: "brands" | "categories";
  orgId: string;
  brands: Brand[];
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const isBrand = kind === "brands";
  const items = isBrand ? brands : categories;

  const addMut = useMutation({
    mutationFn: async () => {
      if (isBrand) await createBrand(orgId, name);
      else await createCategory(orgId, name);
    },
    onSuccess: () => setName(""),
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => {
      if (isBrand) await deleteBrand(orgId, id);
      else await deleteCategory(orgId, id);
    },
    onError: () => toast.error("Cannot delete — it may be in use by products."),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isBrand ? "Manage brands" : "Manage categories"}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            value={name}
            placeholder={isBrand ? "e.g., MO Extra" : "e.g., Soft Drinks"}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && addMut.mutate()}
          />
          <Button disabled={!name.trim() || addMut.isPending} onClick={() => addMut.mutate()}>Add</Button>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md bg-accent/50 px-2 py-1.5 text-sm">
              <span>{item.name}</span>
              <button type="button" onClick={() => delMut.mutate(item.id)} aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nothing here yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
