import * as Notifications from "expo-notifications";
import { getLocales } from "expo-localization";
import { Platform } from "react-native";
import { track } from "../analytics";
import { ReminderService } from "./reminder-engine";

const reminderId = "keylingo-daily-practice";
const channelId = "daily-practice";
const reminder = new ReminderService({
  async requestPermission() {
    if (Platform.OS === "web") return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: "Daily practice",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    let permission = await Notifications.getPermissionsAsync();
    if (
      !permission.granted &&
      permission.ios?.status !==
        Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      permission = await Notifications.requestPermissionsAsync();
    }
    const granted =
      permission.granted ||
      permission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL;
    track("notification_permission_result", { granted });
    return granted;
  },
  async schedule(hour, minute) {
    const korean = getLocales()[0]?.languageCode === "ko";
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId,
      content: {
        title: korean
          ? "가볍게, 오늘의 타이핑"
          : "A little typing, a little progress",
        body: korean
          ? "KeyLingo에서 오늘의 연습을 시작해요."
          : "Your daily KeyLingo practice is ready.",
        data: { route: "/learn", kind: "daily-practice" },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId,
      },
    });
    track("notification_scheduled", { hour, minute });
  },
  async cancel() {
    if (Platform.OS !== "web")
      await Notifications.cancelScheduledNotificationAsync(reminderId);
  },
});

/** The UI must call this only after the user chooses to enable reminders. */
export const scheduleReminder = (
  hour: number,
  minute: number,
): Promise<boolean> => reminder.schedule(hour, minute);
export const cancelReminder = (): Promise<void> => reminder.cancel();

export function subscribeReminderOpen(callback: () => void): () => void {
  if (Platform.OS === "web") return () => {};
  let active = true;
  const seen = new Set<string>();
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (
      !active ||
      !response ||
      response.notification.request.content.data?.kind !== "daily-practice"
    )
      return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    track("notification_opened");
    callback();
    try {
      Notifications.clearLastNotificationResponse();
    } catch {
      /* Older native versions may lack this API. */
    }
  };
  try {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  } catch {
    return () => {
      active = false;
    };
  }
}
