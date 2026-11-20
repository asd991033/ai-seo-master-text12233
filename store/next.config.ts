import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@libsql/client", "exceljs"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default config;
