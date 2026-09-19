export class ActiveTimer {
  private accumulatedMs = 0;
  private segmentStartedAt: number | undefined;

  /** Pass a monotonic timestamp (performance.now), never a render-counter estimate. */
  start(nowMs: number): void {
    this.accumulatedMs = 0;
    this.segmentStartedAt = nowMs;
  }

  pause(nowMs: number): void {
    if (this.segmentStartedAt === undefined) return;
    this.accumulatedMs += Math.max(0, nowMs - this.segmentStartedAt);
    this.segmentStartedAt = undefined;
  }

  resume(nowMs: number): void {
    if (this.segmentStartedAt === undefined) this.segmentStartedAt = nowMs;
  }

  elapsed(nowMs: number): number {
    return (
      this.accumulatedMs +
      (this.segmentStartedAt === undefined
        ? 0
        : Math.max(0, nowMs - this.segmentStartedAt))
    );
  }
}
