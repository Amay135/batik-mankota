import type { NextConfig } from "next";

const API = process.env.API_INTERNAL_URL || "http://localhost:8000";

const config: NextConfig = {
  // Django memakai trailing slash; jangan biarkan Next membuangnya saat proxy.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Semua endpoint Django berakhiran "/"; rewrite Next membuang slash akhir, jadi ditambahkan lagi.
      { source: "/api/:path*", destination: `${API}/api/:path*/` },
      { source: "/media/:path*", destination: `${API}/media/:path*` },
    ];
  },
};

export default config;
