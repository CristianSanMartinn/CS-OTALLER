import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function compile(relative, require) {
  const result = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      module: result,
      exports: result.exports,
      require,
      AbortController,
      URLSearchParams,
    },
  );
  return result.exports;
}
function mount() {
  let cursor = 0,
    props = ["ABCD12", "admin:workshop", true];
  const slots = [],
    pending = [];
  const react = {
    useRef(value) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: value });
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (v) => {
          slots[i] = v;
        },
      ];
    },
    useEffect(run, deps) {
      const i = cursor++,
        previous = slots[i];
      if (!previous || deps.some((d, j) => d !== previous.deps[j])) {
        previous?.cleanup?.();
        slots[i] = { deps, cleanup: run() };
      }
    },
  };
  const { usePlateRegistrationCheck } = compile(
    "features/vehiculos/hooks/usePlateRegistrationCheck.ts",
    (name) =>
      name === "react"
        ? react
        : {
            checkPlateRegistration(plate, signal) {
              return new Promise((resolve, reject) =>
                pending.push({ plate, signal, resolve, reject }),
              );
            },
          },
  );
  return {
    pending,
    render() {
      cursor = 0;
      return usePlateRegistrationCheck(...props);
    },
    change(...next) {
      props = next;
      return this.render();
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}
for (const status of ["ACTIVE", "INACTIVE", "AMBIGUOUS", "NO_MATCH"])
  test(
    "Resultado " + status + " bloquea únicamente coincidencias",
    async () => {
      const form = mount();
      await Promise.resolve();
      const request = form.render().check();
      assert.equal(form.render().busy, true);
      form.pending[0].resolve(status);
      await request;
      const state = form.render();
      assert.equal(state.result, status);
      assert.equal(state.blocked, status !== "NO_MATCH");
    },
  );
test("Escribir no consulta; cambiar patente invalida y aborta respuesta pendiente", async () => {
  const form = mount();
  form.render();
  form.change("ZZ9999", "admin:workshop", true);
  assert.equal(form.pending.length, 0);
  const promise = form.render().check();
  form.change("OTRA12", "admin:workshop", true);
  assert.ok(form.pending[0].signal.aborted);
  form.pending[0].resolve("ACTIVE");
  await promise;
  assert.equal(form.render().result, undefined);
  assert.equal(form.render().blocked, false);
});
test("Dos consultas concurrentes: respuesta anterior no sustituye la más reciente", async () => {
  const form = mount();
  const first = form.render().check(),
    second = form.render().check();
  assert.ok(form.pending[0].signal.aborted);
  form.pending[1].resolve("INACTIVE");
  await second;
  form.pending[0].resolve("NO_MATCH");
  await first;
  assert.equal(form.render().result, "INACTIVE");
  assert.equal(form.render().blocked, true);
});
test("Contexto usuario/taller y cierre descartan respuesta y resultado anteriores", async () => {
  for (const context of ["other-user:workshop", "admin:other-workshop"]) {
    const form = mount();
    const request = form.render().check();
    form.change("ABCD12", context, true);
    form.pending[0].resolve("ACTIVE");
    await request;
    assert.equal(form.render().result, undefined);
  }
  const form = mount();
  const request = form.render().check();
  form.unmount();
  assert.ok(form.pending[0].signal.aborted);
  form.pending[0].resolve("ACTIVE");
  await request;
  assert.equal(form.render().result, undefined);
});
test("Red y autorización fallidas nunca son NO_MATCH; trabajador no inicia consulta", async () => {
  for (const error of [
    Error("network"),
    Object.assign(Error("Unauthorized"), { status: 401 }),
    Object.assign(Error("Forbidden"), { status: 403 }),
  ]) {
    const form = mount();
    const request = form.render().check();
    form.pending[0].reject(error);
    await request;
    assert.equal(form.render().result, undefined);
    assert.match(form.render().error, /no confirma disponibilidad/);
  }
  const form = mount();
  await form.change("ABCD12", "worker:workshop", false).check();
  assert.equal(form.pending.length, 0);
});
test("Servicio normaliza, reenvía señal y rechaza respuestas desconocidas", async () => {
  let result = { status: "NO_MATCH" },
    calls = [];
  const api = compile(
    "features/vehiculos/services/plateRegistrationCheck.ts",
    (name) =>
      name === "@/lib/http"
        ? {
            async apiRequest(...args) {
              calls.push(args);
              return result;
            },
          }
        : { normalizePlate: (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "") },
  );
  const abort = new AbortController();
  assert.equal(
    await api.checkPlateRegistration("ab-cd.12", abort.signal),
    "NO_MATCH",
  );
  assert.equal(calls[0][0], "vehicles/plate-check?plate=ABCD12");
  assert.equal(calls[0][3].signal, abort.signal);
  result = { status: "FREE" };
  await assert.rejects(() =>
    api.checkPlateRegistration("ABCD12", abort.signal),
  );
  for (const value of ["", "---", "A".repeat(21)])
    await assert.rejects(() => api.checkPlateRegistration(value, abort.signal));
  assert.equal(calls.length, 2);
});

test("Una coincidencia conocida sigue bloqueada si falla la nueva comprobación", async () => {
  const form = mount();
  const first = form.render().check();
  form.pending[0].resolve("INACTIVE");
  await first;
  const retry = form.render().check();
  assert.equal(form.render().blocked, true);
  form.pending[1].reject(Error("network"));
  await retry;
  assert.equal(form.render().result, "INACTIVE");
  assert.equal(form.render().blocked, true);
  assert.ok(form.render().error);
});
test("Volver a una patente anterior no recupera su resultado antiguo", async () => {
  const form = mount();
  const first = form.render().check();
  form.pending[0].resolve("ACTIVE");
  await first;
  form.change("NEW123", "admin:workshop", true);
  form.render();
  form.change("ABCD12", "admin:workshop", true);
  assert.equal(form.render().result, undefined);
  assert.equal(form.render().blocked, false);
});

test("El estado público del hook nunca filtra key a un spread JSX", async () => {
  const form = mount();
  const assertPublic = (value) => {
    assert.equal(Object.hasOwn(value, "key"), false);
    assert.deepEqual(Object.keys(value).sort(), [
      "blocked",
      "busy",
      "check",
      "error",
      "result",
    ]);
  };
  assertPublic(form.render());
  const first = form.render().check();
  assertPublic(form.render());
  form.pending[0].resolve("ACTIVE");
  await first;
  assertPublic(form.render());
  form.change("ZZ9999", "admin:other-workshop", true);
  assertPublic(form.render());
  const second = form.render().check();
  form.pending[1].reject(Error("network"));
  await second;
  assertPublic(form.render());
  form.change("ZZ9999", "worker:other-workshop", false);
  assertPublic(form.render());
  form.unmount();
});
