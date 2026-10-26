import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { CartDrawer } from "./components/CartDrawer";
import { SiteHeader } from "./components/SiteHeader";
import { CartProvider } from "./lib/cart";
import { MenuProvider, useMenu } from "./lib/menu";
import { MenuPage } from "./pages/MenuPage";
import { TicketPage } from "./pages/TicketPage";

const AdminPage = lazy(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })));

function Shell() {
  const location = useLocation();
  const menu = useMenu();
  const home = location.pathname === "/";
  const [header, setHeader] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    document.getElementById("header-fallback")?.remove();
    setHeader(document.getElementById("header"));
  }, []);

  useEffect(() => {
    const hero = document.getElementById("inicio");
    const headerSlot = document.getElementById("header");
    if (hero) hero.hidden = !home;
    if (headerSlot) headerSlot.hidden = !home;
  }, [home]);

  return (
    <>
      {home && header ? createPortal(<SiteHeader instagram={menu.instagram} whatsapp={menu.whatsapp} />, header) : null}
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/pedido/:token" element={<TicketPage />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<p className="px-4 py-8">Cargando…</p>}>
              <AdminPage />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <MenuProvider>
        <CartProvider>
          <Shell />
          <CartDrawer />
        </CartProvider>
      </MenuProvider>
    </BrowserRouter>
  );
}
