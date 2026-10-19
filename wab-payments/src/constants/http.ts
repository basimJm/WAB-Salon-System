export const HTTP_STATUS = {
  ok: 200,
  multipleChoices: 300,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  requestTimeout: 408,
  tooManyRequests: 429,
  serverError: 500,
} as const;
