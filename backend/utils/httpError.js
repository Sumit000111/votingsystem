/**
 * Error carrying an HTTP status; thrown from controllers/services and turned
 * into a JSON response by the global error handler.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

module.exports = HttpError;
