import type { NextConfig } from "next";

import fs from 'fs';
import path from 'path';

// Enforce .env.local existence check
const envLocalPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: .env.local file is missing in frontend directory.');
  console.error('Please create .env.local and set the required variables.');
  process.exit(1);
}

import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
};

export default withNextIntl(nextConfig);
