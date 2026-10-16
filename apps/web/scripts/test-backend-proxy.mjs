import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewUrl = "https://example-api-preview.vercel.app/api";
const fakeSecret = "test-only-preview-secret-not-a-real-credential";

function createProxy(environment, upstream) {
  const calls = [];
  const cache = new Map();
  const responseFactory = {
    json(value, options) {
      const response = Response.json(value, options);
      response.cookies = { set() {}, delete() {} };
      return response;
    },
  };

  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const testModule = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;

    vm.runInNewContext(source, {
      module: testModule,
      exports: testModule.exports,
      process: { env: environment },
      URL,
      AbortSignal,
      require(name) {
        if (name === "server-only") return {};
        if (name === "next/server") {
          return { NextResponse: responseFactory };
        }
        if (name.startsWith("./")) {
          return load(path.resolve(path.dirname(filename), name + ".ts"));
        }
        throw new Error("Dependencia no prevista en la prueba del proxy.");
      },
      async fetch(url, options) {
        calls.push({ url: String(url), options });
        if (upstream) return upstream(url, options);
        return Response.json({ setupRequired: false });
      },
    });

    cache.set(filename, testModule.exports);
    return testModule.exports;
  }

  const proxy = load(path.join(root, "lib/server/backendProxy.ts"));
  return { ...proxy, calls };
}

function request({ session = false, headers = {} } = {}) {
  return {
    method: "GET",
    headers: new Headers(headers),
    cookies: {
      get: () => (session ? { value: "test-only-session" } : undefined),
    },
    nextUrl: new URL(
      "https://example-web-preview.vercel.app/api/backend/auth/setup",
    ),
  };
}

test("Preview autentica el acceso a Vercel sin devolver la clave al navegador", async () => {
  const proxy = createProxy({
    VERCEL_ENV: "preview",
    API_URL: previewUrl,
    API_PREVIEW_BYPASS_SECRET: fakeSecret,
  });
  const response = await proxy.backendProxy(request(), ["auth", "setup"]);
  assert.equal(response.status, 200);
  assert.equal(proxy.calls.length, 1);
  assert.equal(
    proxy.calls[0].options.headers["x-vercel-protection-bypass"],
    fakeSecret,
  );
  assert.equal(proxy.calls[0].options.redirect, "error");
  assert.equal(response.headers.has("x-vercel-protection-bypass"), false);
  assert.equal((await response.text()).includes(fakeSecret), false);
});

for (const environment of ["production", "development", undefined]) {
  test(`El entorno ${environment ?? "local"} no envía la clave de Preview`, async () => {
    const proxy = createProxy({
      VERCEL_ENV: environment,
      API_URL: previewUrl,
      API_PREVIEW_BYPASS_SECRET: fakeSecret,
    });
    await proxy.backendProxy(request(), ["auth", "setup"]);
    assert.equal(proxy.calls[0].options.redirect, "follow");
    assert.equal(
      proxy.calls[0].options.headers["x-vercel-protection-bypass"],
      undefined,
    );
  });
}

test("Preview sin clave conserva el acceso a una API sin protección adicional", async () => {
  const proxy = createProxy({ VERCEL_ENV: "preview", API_URL: previewUrl });
  const response = await proxy.backendProxy(request(), ["auth", "setup"]);
  assert.equal(response.status, 200);
  assert.equal(
    proxy.calls[0].options.headers["x-vercel-protection-bypass"],
    undefined,
  );
});

for (const url of [
  "http://example-api-preview.vercel.app/api",
  "https://example.com/api",
]) {
  test(`No envía la clave a un destino no permitido: ${url}`, async () => {
    const proxy = createProxy({
      VERCEL_ENV: "preview",
      API_URL: url,
      API_PREVIEW_BYPASS_SECRET: fakeSecret,
    });
    const response = await proxy.backendProxy(request(), ["auth", "setup"]);
    assert.equal(response.status, 502);
    assert.equal(proxy.calls.length, 0);
  });
}

test("La clave de Vercel no sustituye la sesión del usuario", async () => {
  const proxy = createProxy({
    VERCEL_ENV: "preview",
    API_URL: previewUrl,
    API_PREVIEW_BYPASS_SECRET: fakeSecret,
  });
  const response = await proxy.backendProxy(request(), ["customers"]);
  assert.equal(response.status, 401);
  assert.equal(proxy.calls.length, 0);
});

test("Las peticiones con sesión conservan el JWT y rechazan claves aportadas por el navegador", async () => {
  const proxy = createProxy({
    VERCEL_ENV: "preview",
    API_URL: previewUrl,
    API_PREVIEW_BYPASS_SECRET: fakeSecret,
  });
  await proxy.backendProxy(
    request({
      session: true,
      headers: { "x-vercel-protection-bypass": "untrusted-browser-value" },
    }),
    ["customers"],
  );
  const headers = proxy.calls[0].options.headers;
  assert.equal(headers.Authorization, "Bearer test-only-session");
  assert.equal(headers["x-vercel-protection-bypass"], fakeSecret);
});

test("Una redirección de la API no expone la clave en la respuesta del proxy", async () => {
  const proxy = createProxy(
    {
      VERCEL_ENV: "preview",
      API_URL: previewUrl,
      API_PREVIEW_BYPASS_SECRET: fakeSecret,
    },
    async (_url, options) => {
      assert.equal(options.redirect, "error");
      throw new TypeError("Unexpected redirect");
    },
  );
  const response = await proxy.backendProxy(request(), ["auth", "setup"]);
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes(fakeSecret), false);
});
