const buckets = new Map();

export const rateLimit = ({ windowMs, max, keyPrefix }) => {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, please try again later",
      });
    }

    return next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60 * 1000).unref();
