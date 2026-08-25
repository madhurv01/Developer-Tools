// A real scheduled job - the kind of thing that has no place running inside
// a request/response web service (a nightly report, a cleanup task, a data
// sync). Render runs this as its OWN separate service on a cron schedule
// (defined in render.yaml), completely independent of the web service above
// - if the web service crashes, this still runs on schedule, and vice versa.

const runAt = new Date().toISOString();
console.log(`[cron job] Running scheduled task at ${runAt}`);
console.log("[cron job] (In a real project: send a daily report, clean up old rows, sync data, etc.)");
console.log("[cron job] Done.");
