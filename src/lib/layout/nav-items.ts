import {
  Bell,
  Bookmark,
  Compass,
  Home,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";

export type MainNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Affiché dans la barre de navigation mobile (< 500px). */
  mobile?: boolean;
};

export function buildMainNavItems(
  profileUsername?: string | null
): MainNavItem[] {
  return [
    { href: "/", label: "Accueil", icon: Home, mobile: true },
    { href: "/search", label: "Rechercher", icon: Search, mobile: true },
    { href: "/trending", label: "Explorer", icon: Compass, mobile: true },
    { href: "/notifications", label: "Notifications", icon: Bell, mobile: true },
    profileUsername
      ? {
          href: `/profile/${profileUsername}`,
          label: "Profil",
          icon: User,
          mobile: true,
        }
      : { href: "/login", label: "Profil", icon: User, mobile: true },
    profileUsername
      ? { href: "/saved", label: "Sauvegardés", icon: Bookmark }
      : { href: "/login", label: "Sauvegardés", icon: Bookmark },
  ];
}

export function buildMobileNavItems(
  profileUsername?: string | null
): MainNavItem[] {
  return buildMainNavItems(profileUsername).filter((item) => item.mobile);
}

export function isMainNavActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  if (href === "/" && pathname === "/") return true;
  if (href === "/notifications" && pathname.startsWith("/notifications")) {
    return true;
  }
  if (href === "/search" && pathname.startsWith("/search")) return true;
  if (href === "/trending" && pathname.startsWith("/trending")) return true;
  if (
    href.startsWith("/profile/") &&
    pathname.startsWith("/profile/") &&
    !pathname.startsWith("/profile/edit")
  ) {
    return href === pathname || pathname.startsWith(`${href}/`);
  }
  return false;
}
