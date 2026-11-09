import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function localAdminPassword(): string {
  const source = readFileSync(new URL("../.dev.vars", import.meta.url), "utf8");
  const line = source.split(/\r?\n/).find((item) => item.startsWith("ADMIN_PASSWORD="));
  const password = line?.slice("ADMIN_PASSWORD=".length).trim();
  if (!password) throw new Error("Falta ADMIN_PASSWORD en .dev.vars");
  return password;
}

test("el menú se puede pedir por WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Amaría Bakery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pastel de zanahoria" })).toBeVisible();
  const cafeProducts = await page.getByRole("heading", { level: 3, name: /^Café/ }).count();
  await expect(page.getByRole("heading", { level: 2, name: "Café", exact: true })).toHaveCount(cafeProducts > 0 ? 1 : 0);

  const violations = await new AxeBuilder({ page }).analyze();
  expect(violations.violations).toEqual([]);

  await page.getByRole("heading", { level: 3, name: "Pastel de zanahoria" }).getByRole("button").click();
  await page.getByRole("button", { name: "Aumentar cantidad de Pastel de zanahoria" }).click();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("status")).toHaveText("Agregado");
  await expect(page.getByRole("dialog", { name: "Tu pedido" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Carrito/ }).click();
  const dialog = page.getByRole("dialog", { name: "Tu pedido" });
  await expect(dialog.getByText("2 × $480")).toBeVisible();
  await expect(dialog.getByText("Total", { exact: true })).toBeVisible();
  await expect(dialog.getByText("$960")).toBeVisible();
  await expect(dialog.getByText("Solo recoger en el local. No hay envío a domicilio.")).toBeVisible();
  await dialog.getByLabel("Nombre").fill("Ana López");
  await dialog.getByLabel("Teléfono").fill("3121234567");
  await dialog.getByRole("group", { name: "Fecha para tu pedido" }).getByRole("radio").first().click();
  await dialog.getByRole("group", { name: "¿A qué hora quieres tu pedido?" }).getByRole("radio").first().click();
  await dialog.getByRole("button", { name: "Siguiente" }).click();
  await expect(dialog.getByText("Anticipo del 50%")).toBeVisible();
  await expect(dialog.getByText("$480")).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await dialog.getByRole("button", { name: "Listo" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/wa\.me\/5213123769977/);
  expect(decodeURIComponent(popup.url())).toMatch(/Pastel de zanahoria|Pastel\+de\+zanahoria/);
  await expect(page.getByRole("dialog", { name: "Tu pedido" })).toHaveCount(0);
  await page.getByRole("heading", { level: 3, name: "Pastel de zanahoria" }).getByRole("button").click();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();
});

test("el admin entra y ve los productos", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill(localAdminPassword());
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("tab", { name: "Pedidos" })).toBeVisible();
  await page.getByRole("tab", { name: "Modificar menú" }).click();
  await expect(page.getByRole("button", { name: "Pastel de zanahoria" })).toBeVisible();
});
