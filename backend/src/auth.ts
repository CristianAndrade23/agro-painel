import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const ISSUER = 'agro-painel-api';
const TOKEN_TTL = '8h';

/** Usuário administrador da demonstração (as credenciais aparecem na tela de login). */
export const DEMO_ADMIN = { id: 1, name: 'Administrador', username: 'admin', password: 'admin123' };

export interface AuthenticatedRequest extends Request {
  user?: { clientId: number; clientName: string };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** POST /authentication/signin — devolve `{ token: "Bearer <jwt>" }`, como o backend original. */
export function signinHandler(secret: string) {
  return (req: Request, res: Response) => {
    const { username, password } = (req.body ?? {}) as { username?: unknown; password?: unknown };
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ message: 'Informe usuário e senha.' });
      return;
    }
    if (!safeEqual(username, DEMO_ADMIN.username) || !safeEqual(password, DEMO_ADMIN.password)) {
      res.status(401).json({ message: 'Credenciais inválidas' });
      return;
    }

    const token = jwt.sign({ name: DEMO_ADMIN.name }, secret, {
      subject: String(DEMO_ADMIN.id),
      issuer: ISSUER,
      expiresIn: TOKEN_TTL,
    });
    res.json({ token: `Bearer ${token}` });
  };
}

export function requireAuth(secret: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      res.setHeader('WWW-Authenticate', 'Bearer token_type="JWT"');
      res.status(401).json({ message: 'Você precisa se autenticar.' });
      return;
    }

    try {
      const payload = jwt.verify(token, secret, { issuer: ISSUER }) as jwt.JwtPayload;
      req.user = { clientId: Number(payload.sub), clientName: String(payload['name']) };
      next();
    } catch {
      res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    }
  };
}
