import {
  ReminderService,
  type ReminderDriver,
} from "../src/services/reminder-engine";

function setup(granted = true) {
  const calls: string[] = [];
  let scheduled: { hour: number; minute: number } | undefined;
  const driver: ReminderDriver = {
    requestPermission: async () => {
      calls.push("permission");
      return granted;
    },
    schedule: async (hour, minute) => {
      calls.push("schedule");
      scheduled = { hour, minute };
    },
    cancel: async () => {
      calls.push("cancel");
    },
  };
  return {
    service: new ReminderService(driver),
    calls,
    get scheduled() {
      return scheduled;
    },
  };
}

test("reminders never request permission on initialization, only explicit scheduling", async () => {
  const s = setup();
  expect(s.calls).toEqual([]);
  expect(await s.service.schedule(20, 30)).toBe(true);
  expect(s.calls).toEqual(["permission", "cancel", "schedule"]);
  expect(s.scheduled).toEqual({ hour: 20, minute: 30 });
});

test("denial and invalid times do not schedule or remove the current reminder", async () => {
  const s = setup(false);
  expect(await s.service.schedule(20, 30)).toBe(false);
  expect(s.calls).toEqual(["permission"]);
  for (const [hour, minute] of [
    [24, 0],
    [-1, 20],
    [4, 60],
    [1.5, 30],
    [NaN, 0],
  ]) {
    expect(await s.service.schedule(hour, minute)).toBe(false);
  }
  expect(s.calls).toEqual(["permission"]);
});

test("unsupported notification capability fails gracefully", async () => {
  const service = new ReminderService({
    requestPermission: async () => {
      throw new Error("unsupported");
    },
    schedule: async () => {},
    cancel: async () => {
      throw new Error("unsupported");
    },
  });
  expect(await service.schedule(20, 0)).toBe(false);
  await expect(service.cancel()).resolves.toBeUndefined();
});
