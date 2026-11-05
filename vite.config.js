import { defineConfig } from "vite"

export default defineConfig({
  base: "/age-of-war/",
  server: {
    allowedHosts: [".v0.build"],
  },
})
