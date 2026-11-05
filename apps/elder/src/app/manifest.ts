import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ElderSafe Guardian",
    short_name: "ElderSafe",
    description: "Elder-first safety web app",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f7f4",
    theme_color: "#1f6b4a",
    lang: "zh-HK",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
