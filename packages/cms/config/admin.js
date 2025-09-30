module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'yL9zD5tW1XvR8YfrJG8qLQ=='),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'aU2v4VqJ1YpW9ZfpEJ7rKQ=='),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'xN3s7QjT2ZqU4ZgqEI9rMQ=='),
    },
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});