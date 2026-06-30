export type MobilePageMeta = {
  title: string;
  showBack: boolean;
};

export function getMobilePageMeta(
  pathname: string,
  profileUsername?: string | null
): MobilePageMeta {
  if (pathname === "/notifications") {
    return { title: "Notifications", showBack: false };
  }
  if (pathname === "/search") {
    return { title: "Rechercher", showBack: false };
  }
  if (pathname === "/trending") {
    return { title: "Explorer", showBack: false };
  }
  if (pathname === "/saved") {
    return { title: "Sauvegardés", showBack: false };
  }
  if (pathname === "/profile/edit") {
    return { title: "Modifier le profil", showBack: true };
  }
  if (pathname.startsWith("/post/")) {
    return { title: "Post", showBack: true };
  }
  if (pathname.startsWith("/tag/")) {
    const tag = decodeURIComponent(pathname.slice("/tag/".length));
    return { title: `#${tag}`, showBack: true };
  }
  if (pathname.startsWith("/profile/")) {
    const username = decodeURIComponent(pathname.slice("/profile/".length));
    return { title: username, showBack: true };
  }
  if (profileUsername) {
    return { title: profileUsername, showBack: false };
  }
  return { title: "Bot404", showBack: false };
}
