import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Panel administrativo totalmente dinámico: se usa el modelo de render
  // dinámico clásico en lugar de Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
