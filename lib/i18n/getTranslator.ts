import type { Locale } from "./locale";
import { resolveMessage } from "./resolve";
import { messages } from "./messages";

export type Translator = (key: string) => string;

export function getTranslator(locale: Locale): Translator {
  const tree = messages[locale] as Record<string, unknown>;
  return (key: string) => resolveMessage(tree, key) ?? key;
}
