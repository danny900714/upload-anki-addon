declare namespace NodeJS {
  interface ProcessEnv {
    ANKIWEB_USERNAME: string;
    ANKIWEB_PASSWORD: string;
    ANKIWEB_COOKIE: string;
    ANKIWEB_ADDON_ID?: string;
  }
}
