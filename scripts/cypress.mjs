// Executa o Cypress repassando os argumentos (ex.: `node scripts/cypress.mjs run`).
//
// Terminais integrados de editores baseados em Electron (VS Code, Cursor…) exportam
// ELECTRON_RUN_AS_NODE=1. Herdada pelo Cypress — que também é um app Electron — essa
// variável faz o binário rodar como Node e falhar com "bad option: --smoke-test".
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// O binário não é exportado pelo pacote; localiza-o a partir do campo "bin" do package.json.
const require = createRequire(import.meta.url);
const pkgPath = require.resolve('cypress/package.json');
const cypressBin = join(dirname(pkgPath), require(pkgPath).bin.cypress);
const child = spawn(process.execPath, [cypressBin, ...process.argv.slice(2)], { env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
