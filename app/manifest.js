export default function manifest() {
  return {
    name: "Maris Jewelry",
    short_name: "Maris",
    description: "Fine jewelry, engagement rings, wedding bands, and custom design support from Bangkok.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf6",
    theme_color: "#00493a",
    icons: [
      {
        src: "/assets/images/favicon.png",
        sizes: "256x256",
        type: "image/png"
      },
      {
        src: "/assets/images/logo.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
