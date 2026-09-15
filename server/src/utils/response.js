export function sendSuccess(res, { status = 200, data = null, message, meta } = {}) {
  return res.status(status).json({
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  });
}

export function sendCreated(res, payload) {
  return sendSuccess(res, { status: 201, ...payload });
}
