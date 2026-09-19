import React from "react";
import { Screen, Label, Button } from "./ui";
import i18n from "../localization";
import { captureAppError } from "../analytics/bootstrap";
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    captureAppError(error);
  }
  render() {
    return this.state.failed ? (
      <Screen scroll={false}>
        <Label>{i18n.t("loadError")}</Label>
        <Button
          title={i18n.t("retry")}
          onPress={() => this.setState({ failed: false })}
        />
      </Screen>
    ) : (
      this.props.children
    );
  }
}
