/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
};


export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
