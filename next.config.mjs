/** @type {import('next').NextConfig} */

const nextConfig = {

  // Force Next à utiliser le dossier du projet actuel comme racine

  outputFileTracingRoot: process.cwd(),

  turbopack: {

    root: process.cwd(),

  },

};

export default nextConfig;

