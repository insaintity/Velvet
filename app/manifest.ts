import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Velvet AI Music Foundry",
    short_name: "Velvet",
    description: "Private studio for creating and publishing AI music releases.",
    start_url: "/projects/new",
    display: "standalone",
    background_color: "#15111f",
    theme_color: "#1b1728",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }]
  };
}
