export async function applyPacingDelay(pacingMs: number): Promise<void> {
  if (pacingMs <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, pacingMs);
  });
}
