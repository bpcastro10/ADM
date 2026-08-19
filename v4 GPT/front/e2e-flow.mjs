import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const DOWNLOAD_DIR = path.resolve(process.cwd(), 'tmp-downloads');

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function run(baseUrl) {
  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const uiErrors = [];
  const downloads = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(250);

    // Assert key buttons exist (presence check only here).
    const requiredButtons = [
      'Evaluar',
      'Evaluar y descargar PDF',
      'Evaluar CV',
      'Descargar PDF (CV)',
      'Descargar PDF unificado (Código + CV)',
    ];
    const buttonsPresenceInitial = {};
    for (const name of requiredButtons) {
      buttonsPresenceInitial[name] = (await page.getByRole('button', { name }).count()) > 0;
    }

    // Step 1: candidate + code + evaluate.
    await page.getByPlaceholder('Ej: Juan Pérez, Prueba #123').fill('Candidato E2E - ' + new Date().toISOString());
    await page.getByPlaceholder('Pega el código fuente del candidato...').fill(
      [
        'def suma(a, b):',
        '    return a + b',
        '',
        'print(suma(2, 3))',
      ].join('\n'),
    );

    await page.getByRole('button', { name: 'Evaluar', exact: true }).click();

    // Wait for either result, loading end, or visible error.
    await Promise.race([
      page.getByText('Nota global').waitFor({ timeout: 60_000 }),
      page.locator('.error-msg').first().waitFor({ timeout: 60_000 }),
    ]);

    const codeErrorText = await page.locator('.error-msg').first().textContent().catch(() => null);
    if (codeErrorText) uiErrors.push({ step: 'evaluar_codigo', message: codeErrorText.trim() });

    // Step 2: job description + resume text + evaluate CV.
    await page
      .getByPlaceholder('Pega la descripción del empleo (responsabilidades, requisitos, stack, seniority)...')
      .fill(
        [
          'Buscamos desarrollador/a backend con experiencia en Python y APIs REST.',
          'Requisitos: manejo de Git, pruebas, buenas prácticas, manejo de errores, trabajo en equipo.',
        ].join('\n'),
      );
    await page.getByPlaceholder('Pega aquí el texto del CV...').fill(
      [
        'Nombre: Candidato E2E',
        'Experiencia: 3 años desarrollando APIs con Python (FastAPI), pruebas automatizadas, Docker.',
        'Habilidades: Python, REST, SQL, Git, CI/CD.',
      ].join('\n'),
    );

    await page.getByRole('button', { name: 'Evaluar CV', exact: true }).click();

    await Promise.race([
      page.getByText('Match score').waitFor({ timeout: 60_000 }),
      page.locator('.error-msg').nth(1).waitFor({ timeout: 60_000 }),
    ]);

    const resumeErrorText = await page.locator('.error-msg').nth(1).textContent().catch(() => null);
    if (resumeErrorText) uiErrors.push({ step: 'evaluar_cv', message: resumeErrorText.trim() });

    const buttonsPresenceAfter = {};
    for (const name of requiredButtons) {
      buttonsPresenceAfter[name] = (await page.getByRole('button', { name }).count()) > 0;
    }

    // Step 3: Download PDF (CV) and unified PDF.
    // "Descargar PDF (CV)" exists in two places; click enabled one.
    const downloadCvBtn = page.getByRole('button', { name: 'Descargar PDF (CV)', exact: true }).first();
    const cvDownload = await Promise.race([
      page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
      (async () => {
        await downloadCvBtn.click({ timeout: 5_000 });
        return page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
      })(),
    ]);

    if (cvDownload) {
      const suggested = cvDownload.suggestedFilename();
      const outPath = path.join(DOWNLOAD_DIR, suggested);
      await cvDownload.saveAs(outPath);
      downloads.push({ kind: 'cv_pdf', filename: suggested, savedTo: outPath, exists: await fileExists(outPath) });
    } else {
      uiErrors.push({ step: 'descargar_pdf_cv', message: 'No se detectó descarga de PDF (CV).' });
    }

    const unifiedBtn = page
      .getByRole('button', { name: 'Descargar PDF unificado (Código + CV)', exact: true })
      .first();
    const unifiedDownload = await Promise.race([
      page.waitForEvent('download', { timeout: 30_000 }).catch(() => null),
      (async () => {
        await unifiedBtn.click({ timeout: 5_000 });
        return page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
      })(),
    ]);

    if (unifiedDownload) {
      const suggested = unifiedDownload.suggestedFilename();
      const outPath = path.join(DOWNLOAD_DIR, suggested);
      await unifiedDownload.saveAs(outPath);
      downloads.push({ kind: 'unified_pdf', filename: suggested, savedTo: outPath, exists: await fileExists(outPath) });
    } else {
      uiErrors.push({ step: 'descargar_pdf_unificado', message: 'No se detectó descarga de PDF unificado.' });
    }

    return {
      baseUrl,
      buttonsPresenceInitial,
      buttonsPresenceAfter,
      uiErrors,
      consoleErrors,
      pageErrors,
      downloads,
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function main() {
  const targets = ['http://localhost:5174', 'http://localhost:5175'];
  const results = [];
  for (const t of targets) {
    try {
      results.push(await run(t));
      break;
    } catch (e) {
      results.push({ baseUrl: t, fatal: String(e), consoleErrors: [], pageErrors: [], uiErrors: [], downloads: [] });
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('FATAL', e);
  process.exitCode = 1;
});

