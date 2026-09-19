export interface ReminderDriver {
  requestPermission(): Promise<boolean>;
  schedule(hour: number, minute: number): Promise<void>;
  cancel(): Promise<void>;
}

export class ReminderService {
  constructor(private readonly driver: ReminderDriver) {}
  async schedule(hour: number, minute: number): Promise<boolean> {
    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    )
      return false;
    try {
      if (!(await this.driver.requestPermission())) return false;
      await this.driver.cancel();
      await this.driver.schedule(hour, minute);
      return true;
    } catch {
      return false;
    }
  }
  async cancel(): Promise<void> {
    try {
      await this.driver.cancel();
    } catch {
      /* Reminders are optional. */
    }
  }
}
