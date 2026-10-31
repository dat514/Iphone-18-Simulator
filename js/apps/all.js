import { initSettings } from "./settings.js";
import { initCalculator, initClock, initNotes } from "./tools.js";
import { initCamera, initPhotos, initMusic } from "./media.js";
import { initMessages, initPhone, initSafari } from "./social.js";
import { initCalendar, initWeather } from "./info.js";

export const APP_INITS = [initSettings, initCalculator, initClock, initNotes, initCamera, initPhotos, initMusic, initMessages, initPhone, initSafari, initCalendar, initWeather];
