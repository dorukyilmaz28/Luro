import type { Locale } from "../locale";
import type { MessagesDict } from "./tr";
import { en } from "./en";
import { tr } from "./tr";

export const messages: Record<Locale, MessagesDict> = {
  tr,
  en,
};
