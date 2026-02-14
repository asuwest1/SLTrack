/**
 * Wraps an async Express route handler to catch errors and pass them to next().
 * Required because Express 4.x does not automatically catch rejected promises.
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
