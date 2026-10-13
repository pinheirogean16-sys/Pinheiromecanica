export async function register() {
  // Só roda no runtime Node.js (não no Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initConsoleOverride } = await import('./lib/console-override');
    initConsoleOverride();
  }
}
