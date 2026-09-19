import { Redirect } from "expo-router";
import { useApp } from "../src/state/store";
export default function Index() {
  const completed = useApp((s) => s.profile.settings.tutorialCompleted);
  return <Redirect href={completed ? "/home" : "/onboarding"} />;
}
