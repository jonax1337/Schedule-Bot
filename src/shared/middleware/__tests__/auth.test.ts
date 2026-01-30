import { describe, it, expect, vi, beforeAll } from 'vitest';

// Set env before importing auth module
process.env.JWT_SECRET = 'test-secret-for-vitest-minimum-length';

// Mock logger to avoid side effects
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const { generateToken, verifyTokenSync, verifyToken, requireAdmin, optionalAuth } = await import('../auth.js');

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('generateToken + verifyTokenSync', () => {
  it('generates and verifies a valid admin token', () => {
    const token = generateToken('admin', 'admin');
    const decoded = verifyTokenSync(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.username).toBe('admin');
    expect(decoded!.role).toBe('admin');
  });

  it('generates and verifies a valid user token', () => {
    const token = generateToken('player1', 'user');
    const decoded = verifyTokenSync(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.role).toBe('user');
  });

  it('returns null for invalid token', () => {
    expect(verifyTokenSync('invalid.token.here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(verifyTokenSync('')).toBeNull();
  });
});

describe('verifyToken middleware', () => {
  it('rejects request without auth header', () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects request with non-Bearer header', () => {
    const req: any = { headers: { authorization: 'Basic abc' } };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepts valid Bearer token and sets req.user', () => {
    const token = generateToken('admin', 'admin');
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.username).toBe('admin');
  });

  it('rejects expired/invalid token', () => {
    const req: any = { headers: { authorization: 'Bearer bad.token.value' } };
    const res = mockRes();
    const next = vi.fn();

    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin middleware', () => {
  it('allows admin user', () => {
    const req: any = { user: { username: 'admin', role: 'admin' } };
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks non-admin user', () => {
    const req: any = { user: { username: 'player', role: 'user' } };
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks request without user', () => {
    const req: any = {};
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('optionalAuth middleware', () => {
  it('continues without auth header', () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('sets user for valid token', () => {
    const token = generateToken('player', 'user');
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.username).toBe('player');
  });

  it('continues without user for invalid token', () => {
    const req: any = { headers: { authorization: 'Bearer bad.token' } };
    const res = mockRes();
    const next = vi.fn();

    optionalAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});
