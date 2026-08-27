import { Bike, Boxes, Calendar, LayoutDashboard, Package, UtensilsCrossed, Wallet } from "lucide-react";
import type { ComponentType } from "react";

export type JokerSidebarTab = "pedidos" | "productos" | "panel" | "cuenta" | "stock" | "delivery" | "mes";

type SidebarItem = {
  tab: JokerSidebarTab;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  adminOnly: boolean;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { tab: "pedidos", label: "Pedidos", icon: UtensilsCrossed, adminOnly: false },
  { tab: "productos", label: "Productos", icon: Package, adminOnly: true },
  { tab: "panel", label: "Panel", icon: LayoutDashboard, adminOnly: true },
  { tab: "cuenta", label: "Cuenta corriente", icon: Wallet, adminOnly: true },
  { tab: "stock", label: "Stock", icon: Boxes, adminOnly: true },
  { tab: "delivery", label: "Delivery", icon: Bike, adminOnly: true },
  { tab: "mes", label: "Mes", icon: Calendar, adminOnly: true }
];

type JokerSidebarProps = {
  activeTab: JokerSidebarTab;
  isAdmin: boolean;
  onNavigate: (tab: JokerSidebarTab) => void;
};

// Barra de navegacion fija a la derecha, siempre visible (reemplaza la
// lista de pestanas que antes vivia en el menu desplegable del icono de
// usuario). Ese menu ahora solo tiene Impresora y Cerrar sesion.
export function JokerSidebar({ activeTab, isAdmin, onNavigate }: JokerSidebarProps) {
  const items = SIDEBAR_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  return (
    <nav className="joker-sidebar" aria-label="Secciones">
      <img className="joker-sidebar__mark" src={`${import.meta.env.BASE_URL}icons/logo-joker-mark.png`} alt="" aria-hidden="true" />
      <div className="joker-sidebar__divider" />
      <ul className="joker-sidebar__list">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <li key={item.tab}>
              <button
                type="button"
                className={`joker-sidebar__item${isActive ? " is-active" : ""}`}
                onClick={() => onNavigate(item.tab)}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="joker-sidebar__label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
