/* Private bootstrap for the pinned Tesseract.js 7.0.0 native worker. No nested workers. */
"use strict";
// Do not allow library diagnostic messages to expose document contents.
for (const method of ["log", "info", "warn", "error", "debug"])
  console[method] = () => {};
const localRoot = new URL("/ocr/tesseract-7.0.0/", self.location.origin);
const nativeFetch = self.fetch.bind(self);
self.fetch = (input, init) => {
  const url = new URL(
    typeof input === "string" ? input : input.url || String(input),
    self.location.href,
  );
  if (
    url.origin !== localRoot.origin ||
    !url.pathname.startsWith(localRoot.pathname) ||
    (init?.method || (input instanceof Request ? input.method : "GET")) !==
      "GET" ||
    init?.body
  )
    return Promise.reject(new Error("LOCAL_RESOURCE_ONLY"));
  return nativeFetch(url.href, {
    ...init,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
};
const nativeImport = self.importScripts.bind(self);
self.importScripts = (...urls) => {
  const safe = urls.map((value) => {
    const url = new URL(value, self.location.href);
    if (
      url.origin !== localRoot.origin ||
      !url.pathname.startsWith(localRoot.pathname)
    )
      throw new Error("LOCAL_RESOURCE_ONLY");
    return url.href;
  });
  nativeImport(...safe);
};
importScripts("/ocr/tesseract-7.0.0/worker.min.js");
