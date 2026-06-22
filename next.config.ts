import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Consente di provare il server di sviluppo da smartphone sulla rete locale.
  allowedDevOrigins: ["192.168.1.15", "127.0.0.1"],
};

export default nextConfig;
