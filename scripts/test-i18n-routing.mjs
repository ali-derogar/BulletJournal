import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';

const HOST = '127.0.0.1';
const PORT = 3199;
const BASE = `http://${HOST}:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) {
        return;
      }
    } catch {
      // keep polling until server is reachable
    }
    await sleep(750);
  }

  throw new Error('Timed out waiting for Next.js dev server to be ready.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { res, text };
}

async function run() {
  const dev = spawn('npm', ['run', 'dev', '--', '--hostname', HOST, '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: true,
  });

  let output = '';
  dev.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  dev.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForServerReady();

    const rootRedirect = await fetch(`${BASE}/`, { redirect: 'manual' });
    assert(rootRedirect.status === 307, `/ should redirect with 307, got ${rootRedirect.status}`);
    assert((rootRedirect.headers.get('location') || '').includes('/en'), '/ should canonicalize to /en');

    const enResponse = await fetch(`${BASE}/en`, { redirect: 'manual' });
    assert(enResponse.status === 200, `/en should return 200, got ${enResponse.status}`);

    const adminRedirect = await fetch(`${BASE}/admin`, {
      redirect: 'manual',
      headers: { Cookie: 'NEXT_LOCALE=fa' },
    });
    assert(adminRedirect.status === 307, `/admin with fa locale should redirect, got ${adminRedirect.status}`);
    assert(
      (adminRedirect.headers.get('location') || '').includes('/fa/admin'),
      '/admin with fa locale should redirect to /fa/admin'
    );

    const { res: faRes, text: faHtml } = await fetchText(`${BASE}/fa`, { redirect: 'manual' });
    assert(faRes.status === 200, `/fa should return 200, got ${faRes.status}`);
    assert(faHtml.includes('<html lang="fa" dir="rtl"'), '/fa should render html with lang=fa and dir=rtl');

    const profileRedirect = await fetch(`${BASE}/profile`, {
      redirect: 'manual',
      headers: { Cookie: 'NEXT_LOCALE=fa' },
    });
    assert(profileRedirect.status === 307, `/profile with fa locale should redirect, got ${profileRedirect.status}`);
    assert(
      (profileRedirect.headers.get('location') || '').includes('/fa/profile'),
      '/profile with fa locale should redirect to /fa/profile'
    );

    const faProfile = await fetch(`${BASE}/fa/profile`, { redirect: 'manual' });
    assert(faProfile.status !== 404, '/fa/profile must not return 404');

    const verifyRedirect = await fetch(`${BASE}/auth/verify-email?token=x&email=y`, {
      redirect: 'manual',
      headers: { Cookie: 'NEXT_LOCALE=fa' },
    });
    assert(
      (verifyRedirect.headers.get('location') || '').includes('/fa/auth/verify-email'),
      '/auth/verify-email with fa locale should redirect to /fa/auth/verify-email'
    );

    const faVerify = await fetch(`${BASE}/fa/auth/verify-email?token=x&email=y`, { redirect: 'manual' });
    assert(faVerify.status !== 404, '/fa/auth/verify-email must not return 404');

    const faShared = await fetch(`${BASE}/fa/share/profile-test/sample-token`, { redirect: 'manual' });
    assert(faShared.status !== 404, '/fa/share/profile-test/[token] must not return 404');

    const faAdmin = await fetch(`${BASE}/fa/admin`, { redirect: 'manual' });
    assert(faAdmin.status !== 404, '/fa/admin must not return 404');

    console.log('i18n routing checks passed.');
  } finally {
    try {
      process.kill(-dev.pid, 'SIGINT');
    } catch {
      dev.kill('SIGINT');
    }

    const exited = await Promise.race([
      once(dev, 'exit').then(() => true),
      sleep(5_000).then(() => false),
    ]);

    if (!exited) {
      try {
        process.kill(-dev.pid, 'SIGKILL');
      } catch {
        dev.kill('SIGKILL');
      }
      await once(dev, 'exit');
    }

    if (process.env.DEBUG_I18N_TESTS === '1') {
      console.log(output);
    }
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
