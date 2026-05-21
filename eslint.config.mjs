import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [
      "node_modules/**",
      "apps/api/dist/**",
      "apps/web/.next/**",
      "apps/web/next-env.d.ts"
    ]
  },
  ...nextVitals
];
