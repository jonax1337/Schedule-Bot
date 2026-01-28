# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Schedule-Bot, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by emailing the maintainers directly or using [GitHub's private vulnerability reporting](https://github.com/jonax1337/Schedule-Bot/security/advisories/new).

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 1 week
- **Fix:** Depending on severity, typically within 2 weeks for critical issues

## Security Measures

Schedule-Bot implements the following security measures:

- **Helmet.js** for HTTP security headers (CSP, HSTS, X-Frame-Options)
- **CORS** with configurable whitelist
- **Rate limiting** on all API endpoints (stricter on auth and settings)
- **Input sanitization** and **Joi validation** on all user inputs
- **JWT authentication** with 24-hour token expiry
- **bcrypt** password hashing for admin credentials
- **No caching** on API responses containing sensitive data

## Best Practices for Self-Hosting

- Use strong, unique values for `JWT_SECRET` (32+ characters)
- Generate `ADMIN_PASSWORD_HASH` using bcrypt (use the included hash generator)
- Keep `DISCORD_TOKEN` and `DISCORD_CLIENT_SECRET` confidential
- Use HTTPS in production (set `DASHBOARD_URL` accordingly)
- Restrict database access to the application server only
- Regularly update dependencies (`npm audit`)
