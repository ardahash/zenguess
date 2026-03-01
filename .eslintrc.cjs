/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "next/typescript", "prettier"],
  ignorePatterns: [
    ".next/",
    "node_modules/",
    "coverage/",
    "playwright-report/",
    "test-results/",
  ],
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "@next/next/no-html-link-for-pages": "off",
  },
}
