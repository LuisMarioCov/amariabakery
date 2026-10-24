import type { MenuCategory, Order, Product } from "../shared/catalog";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new ApiError(data?.error ?? "No se pudo completar la solicitud", response.status);
  }
  return data as T;
}

export function getMenu() {
  return request<{ categories: MenuCategory[]; instagram: string; whatsapp: string }>("/api/menu");
}

export function createOrder(body: unknown) {
  return request<{ id: string; publicCode: string; totalCents: number; ticketToken: string; whatsappUrl: string }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function adminSession() {
  return request<{ ok: boolean }>("/api/admin/session");
}

export function adminLogin(password: string) {
  return request<{ ok: boolean }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function adminLogout() {
  return request<{ ok: boolean }>("/api/admin/logout", { method: "POST" });
}

export function adminCatalog() {
  return request<{ categories: MenuCategory[] }>("/api/admin/catalog");
}

export function adminOrders() {
  return request<{ orders: Order[] }>("/api/admin/orders");
}

export function updateOrderStatus(id: string, status: Order["status"]) {
  return request<{ ok: boolean }>(`/api/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function createProduct(product: unknown) {
  return request<{ id: string }>("/api/admin/products", { method: "POST", body: JSON.stringify(product) });
}

export function createCategory(name: string) {
  return request<{ id: string }>("/api/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
}

export function updateProduct(id: string, product: unknown) {
  return request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(product) });
}

export function deleteProduct(id: string) {
  return request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: "DELETE" });
}

export function uploadPhoto(id: string, photo: Blob) {
  const body = new FormData();
  body.set("photo", photo, "foto.webp");
  return request<{ photoUrl: string }>(`/api/admin/products/${id}/photo`, { method: "POST", body });
}

export type { Product };
