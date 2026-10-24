import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("el menú se puede pedir por WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Amaría Bakery" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pastel de zanahoria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Café" })).toHaveCount(0);

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
  await dialog.getByText("Enviar", { exact: true }).click();
  await expect(dialog.getByText("El envío se paga por transferencia. Al hacerla, envía el pedido por WhatsApp junto con el comprobante.")).toBeVisible();
  await dialog.getByText("Recoger en el local", { exact: true }).click();
  await dialog.getByLabel("Nombre").fill("Ana López");
  await dialog.getByLabel("Teléfono").fill("3121234567");
  await dialog.getByRole("button", { name: "Confirmar y abrir WhatsApp" }).click();
  await expect(dialog.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute("href", /wa\.me\/5213123769977/);
  await expect(dialog.getByRole("link", { name: "Abrir WhatsApp" })).toHaveAttribute("href", /Pastel%20de%20zanahoria|Pastel\+de\+zanahoria/);
  await dialog.getByRole("button", { name: "Seguir en el menú" }).click();
  await expect(page.getByRole("dialog", { name: "Tu pedido" })).toHaveCount(0);
  await page.getByRole("heading", { level: 3, name: "Pastel de zanahoria" }).getByRole("button").click();
  await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeVisible();
});

test("el admin entra y ve los productos", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Contraseña").fill("amaria-local-admin");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Pastel de zanahoria/ })).toBeAttached();
});
