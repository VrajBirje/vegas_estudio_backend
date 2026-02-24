export default (err, req, res, next) => {
  // log full error (stack or object) for debugging
  console.error('[ERROR]', err);

  // determine HTTP status code (SupabaseError may carry a status)
  const status = err.status || 500;

  // provide a user‑friendly message for known cases
  let message = err.message || 'Server error';
  // various network conditions; the Supabase SDK surfaces them either as
  // a FetchError string or wrapped in a generic message we produced above.
  if (
    message === 'fetch failed' ||
    message === 'Unable to reach Supabase service' ||
    message.includes('fetch failed') ||
    message.includes('FetchError') ||
    message.includes('ETIMEDOUT')
  ) {
    message = 'Cannot connect to database. Please try again later.';
  }

  res.status(status).json({ message });
};
