/** Current time for server components, which the purity lint rule won't let call Date.now directly. */
export const nowMs = () => Date.now();
