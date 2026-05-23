import type { NextConfig } from "next";

// 開発時はLAN全体からのアクセスを許可（192.168.x.xどちらのIPでも動く）
const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? ["192.168.0.*", "192.168.1.*", "10.0.0.*", "172.16.*.*"]
      : [],
};

export default nextConfig;
