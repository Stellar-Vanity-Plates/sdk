import { createContext, useContext, useEffect } from "react";

export const CLUBHOUSE_THEME = "clubhouse";
export const ClubhouseContext = createContext(false);
export const useClubhouse = () => useContext(ClubhouseContext);

export function isClubhouseEnvironment(environment?: string, network?: string) {
  return environment === "staging" && network === "testnet";
}

export function withInitialClubhouseTheme(
  html: string,
  environment?: string,
  network?: string,
): string {
  if (!isClubhouseEnvironment(environment, network)) return html;
  return html.replace(
    "<html ",
    `<html data-clubhouse-theme="${CLUBHOUSE_THEME}" `,
  );
}

export function applyClubhouseTheme(element: Pick<HTMLElement, "dataset">) {
  element.dataset.clubhouseTheme = CLUBHOUSE_THEME;
  return () => {
    delete element.dataset.clubhouseTheme;
  };
}

export function ClubhouseTheme() {
  useEffect(() => applyClubhouseTheme(document.documentElement), []);

  return null;
}
