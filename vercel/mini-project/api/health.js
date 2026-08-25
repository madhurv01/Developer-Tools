// Demonstrates two real, commonly-used pieces of the Vercel platform in one
// tiny endpoint: Vercel's own built-in environment variables (automatically
// injected on every deployment, no configuration needed) and a
// project-defined one (set via the dashboard or CLI, see README "Configure").

export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    // Automatically provided by Vercel on every deployment - useful for
    // debugging exactly which deployment/region/environment served a request.
    deployment: {
      region: process.env.VERCEL_REGION || "local (not deployed)",
      environment: process.env.VERCEL_ENV || "development",
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || "n/a (local)",
    },
    // A project-defined variable - only present once you've set it yourself,
    // proving the difference between platform-provided and user-configured
    // environment variables.
    customMessage: process.env.CUSTOM_GREETING || "(CUSTOM_GREETING not set - see README Step 4)",
  });
}
