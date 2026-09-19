import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useApp } from "../state/store";

export function useReducedMotion() {
  const preference = useApp((s) => s.profile.settings.reducedMotion);
  const [system, setSystem] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setSystem(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystem,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return preference || system;
}
