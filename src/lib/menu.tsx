import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMenu } from "./api";
import type { MenuCategory } from "../shared/catalog";

type MenuState = {
  categories: MenuCategory[];
  instagram: string;
  whatsapp: string;
  error: string;
};

const MenuContext = createContext<MenuState>({
  categories: [],
  instagram: "amaria_bakery",
  whatsapp: "5213123769977",
  error: "",
});

export function MenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MenuState>({
    categories: [],
    instagram: "amaria_bakery",
    whatsapp: "5213123769977",
    error: "",
  });

  useEffect(() => {
    getMenu()
      .then((menu) => setState({ categories: menu.categories, instagram: menu.instagram, whatsapp: menu.whatsapp, error: "" }))
      .catch(() => setState((current) => ({ ...current, error: "No se pudo cargar el menú" })));
  }, []);

  return <MenuContext.Provider value={state}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuState {
  return useContext(MenuContext);
}
