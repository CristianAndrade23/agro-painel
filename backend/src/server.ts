import { join } from 'node:path';
import { createApp } from './app.ts';

const root = join(import.meta.dirname, '..');
const port = Number(process.env['PORT'] ?? 3000);

let jwtSecret = process.env['JWT_SECRET'];
if (!jwtSecret) {
  if (process.env['NODE_ENV'] === 'production') {
    console.error('Defina a variável de ambiente JWT_SECRET em produção.');
    process.exit(1);
  }
  jwtSecret = 'agro-painel-dev-secret';
  console.warn('JWT_SECRET não definido; usando segredo de desenvolvimento.');
}

const app = createApp({
  jwtSecret,
  staticDir: join(root, '..', 'dist', 'agro-painel', 'browser'),
});

app.listen(port, () => {
  console.log(`AgroPainel API rodando em http://localhost:${port}/api/v1`);
});
