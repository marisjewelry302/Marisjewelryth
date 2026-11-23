// The one place Maris social accounts are declared. Header, footer, contact,
// wholesale and the JSON-LD `sameAs` all read from here, so changing an
// account means editing a single line.
export const SOCIAL_LINKS = [
  { key: "line", label: "LINE", href: "https://lin.ee/tFg8osD" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/maris_jewelry_th" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/share/1JH2idcjPM/" },
  { key: "pinterest", label: "Pinterest", href: "https://pin.it/5pKmV7MKf" }
];

export function getSocialLink(key) {
  return SOCIAL_LINKS.find((item) => item.key === key);
}
