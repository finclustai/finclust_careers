// Vercel function entry. Loads the output of `nest build` rather than the
// TypeScript source: Vercel's own TS compile does not emit decorator metadata,
// and Nest's dependency injection depends on it.
module.exports = require("../dist/serverless.js").default;
