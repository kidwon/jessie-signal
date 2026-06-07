import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Fires every hour on the hour (UTC). The handler skips outside US trading
// hours / weekends, so only ~7 ticks per weekday actually capture a snapshot.
crons.hourly(
  "market snapshot",
  { minuteUTC: 0 },
  internal.signals.snapshot,
);

export default crons;
