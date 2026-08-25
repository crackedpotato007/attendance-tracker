/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose", "@pulsecron/pulse", "bcryptjs"],
};

export default nextConfig;
