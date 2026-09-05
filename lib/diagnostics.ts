/** Local diagnostics only; errors are never sent to a reporting service. */
export function reportError(error: unknown, stage: string): void {
  console.error(`[${stage}]`, error);
}
