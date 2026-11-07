import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function compile(relative, require, extras = {}) {
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
      Uint8Array,
      setTimeout,
      clearTimeout,
      ...extras,
    },
  );
  return result.exports;
}
const cropGeometry = compile(
  "features/vehiculos/services/registrationCrop.ts",
  () => {
    throw Error("Unexpected dependency");
  },
);
const png = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0],
  jpeg = [255, 216, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  webp = [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80];
function file(bytes = png, type = "image/png", size = bytes.length) {
  return {
    size,
    type,
    slice() {
      return {
        async arrayBuffer() {
          return Uint8Array.from(bytes).buffer;
        },
      };
    },
  };
}
function processor({ width = 800, height = 600, failure = false } = {}) {
  const created = [],
    revoked = [];
  const service = compile(
    "features/vehiculos/services/privateRegistrationImage.ts",
    () => {
      throw Error("Unexpected dependency");
    },
    {
      URL: {
        createObjectURL(file) {
          created.push(file);
          return "blob:private-" + created.length;
        },
        revokeObjectURL(url) {
          revoked.push(url);
        },
      },
      Image: class {
        naturalWidth = width;
        naturalHeight = height;
        async decode() {
          if (failure) throw Error("corrupt");
        }
      },
    },
  );
  return { ...service, created, revoked };
}
for (const [bytes, mime] of [
  [png, "image/png"],
  [jpeg, "image/jpeg"],
  [webp, "image/webp"],
])
  test("Vista previa local admite firma " + mime, async () => {
    const p = processor();
    const image = await p.preparePrivateRegistrationImage(file(bytes, mime));
    assert.equal(image.url, "blob:private-1");
    assert.equal(image.width, 800);
    assert.equal(p.created.length, 1);
    assert.equal(p.revoked.length, 0);
  });
test("Rechaza tamaño vacío/excesivo, formato prohibido y MIME falsificado antes de generar URL", async () => {
  const p = processor();
  for (const item of [
    file(png, "image/png", 0),
    file(png, "image/png", 12 * 1024 * 1024 + 1),
    file([60, 115, 118, 103], "image/svg+xml"),
    file(png, "image/jpeg"),
    file([71, 73, 70, 56], "image/gif"),
  ])
    await assert.rejects(() => p.preparePrivateRegistrationImage(item));
  assert.equal(p.created.length, 0);
});
test("Sin MIME solo admite firma reconocida; imagen corrupta o excesiva revoca URL", async () => {
  const p = processor();
  assert.equal(
    (await p.preparePrivateRegistrationImage(file(png, ""))).url,
    "blob:private-1",
  );
  for (const options of [
    { failure: true },
    { width: 0 },
    { width: 6000, height: 5000 },
  ]) {
    const p = processor(options);
    await assert.rejects(() => p.preparePrivateRegistrationImage(file()));
    assert.deepEqual(p.revoked, ["blob:private-1"]);
  }
});
function mount(deferPreview = false, compatible = true) {
  let cursor = 0;
  const slots = [],
    pending = [],
    preparations = [],
    preparationCancels = [],
    rotations = [],
    thumbnails = [],
    revoked = [];
  const jsx = (type, props) => ({ type, props });
  const react = {
    useId() {
      return "crop-hint";
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef(initial) {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: initial });
    },
    useEffect(run) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { cleanup: run() };
    },
  };
  const editor = compile(
    "features/vehiculos/components/forms/RegistrationCropEditor.tsx",
    (name) =>
      name === "react"
        ? react
        : name === "react/jsx-runtime"
          ? { jsx, jsxs: jsx }
          : name.endsWith("/registrationCrop")
            ? cropGeometry
            : { default: {} },
  );
  const { PrivateRegistrationCapture } = compile(
    "features/vehiculos/components/forms/PrivateRegistrationCapture.tsx",
    (name) =>
      name.endsWith("/registrationCrop")
        ? cropGeometry
        : name.endsWith("/RegistrationCropEditor")
          ? editor
          : name === "react"
            ? react
            : name === "react/jsx-runtime"
              ? { jsx, jsxs: jsx }
              : name.endsWith(".module.css")
                ? { default: {} }
                : name.endsWith("/privateImagePreparation")
                  ? {
                      PREPARATION_UNSUPPORTED:
                        "Registro manual disponible: navegador no compatible.",
                      supportsPrivateImagePreparation: () => compatible,
                      PrivateImagePreparation: class {
                        cancel() {
                          preparationCancels.push(true);
                        }
                        prepare(...args) {
                          return new Promise((resolve, reject) =>
                            preparations.push({ args, resolve, reject }),
                          );
                        }
                      },
                    }
                  : {
                      createPrivateRegistrationPreview(original) {
                        return deferPreview
                          ? new Promise((resolve, reject) =>
                              thumbnails.push({ original, resolve, reject }),
                            )
                          : Promise.resolve(original);
                      },
                      rotatePrivateRegistrationImage(original, turns) {
                        return new Promise((resolve, reject) =>
                          rotations.push({ original, turns, resolve, reject }),
                        );
                      },
                      registrationImageWarnings() {
                        return [];
                      },
                      preparePrivateRegistrationImage(file) {
                        return new Promise((resolve, reject) =>
                          pending.push({ file, resolve, reject }),
                        );
                      },
                    },
    { URL: { revokeObjectURL: (url) => revoked.push(url) } },
  );
  const nodes = (n, p) =>
    !n || typeof n !== "object"
      ? []
      : Array.isArray(n)
        ? n.flatMap((x) => nodes(x, p))
        : typeof n.type === "function"
          ? nodes(n.type(n.props), p)
          : [...(p(n) ? [n] : []), ...nodes(n.props?.children, p)];
  const render = () => {
    cursor = 0;
    return PrivateRegistrationCapture();
  };
  return {
    confirm() {
      this.buttons()
        .find((b) => b.props.children === "Confirmar recorte completo")
        .props.onClick();
    },
    prepare() {
      this.confirm();
      return this.buttons()
        .find((b) => b.props.children === "Preparar imagen para reconocimiento")
        .props.onClick();
    },
    pending,
    preparations,
    preparationCancels,
    rotations,
    thumbnails,
    revoked,
    rotate() {
      return this.buttons()
        .find((n) => n.props.children === "Girar 90° a la derecha")
        .props.onClick();
    },
    buttons: () => nodes(render(), (n) => n.type === "button"),
    inputs: () =>
      nodes(render(), (n) => n.type === "input" && n.props.type === "file"),
    ranges: () =>
      nodes(render(), (n) => n.type === "input" && n.props.type === "range"),
    images: () => nodes(render(), (n) => n.type === "img"),
    statuses: () => nodes(render(), (n) => n.props?.role === "status"),
    alerts: () => nodes(render(), (n) => n.props?.role === "alert"),
    open() {
      this.buttons()
        .find((n) => n.props.children === "Completar desde padrón")
        .props.onClick();
    },
    cancel() {
      this.buttons()
        .find((n) => n.props.children === "Cancelar captura")
        .props.onClick();
    },
    select(file) {
      const input = this.inputs()[0];
      const target = { files: file ? [file] : [], value: "selected" };
      const promise = input.props.onChange({ currentTarget: target });
      assert.equal(target.value, "");
      return promise;
    },
    unmount() {
      for (const s of slots) s?.cleanup?.();
    },
  };
}
test("Cámara y archivo son inputs sin name ni enlace al guardado; todos los botones son type=button", () => {
  const m = mount();
  m.open();
  assert.equal(m.inputs().length, 2);
  assert.equal(m.inputs()[0].props.capture, "environment");
  assert.ok(
    m
      .inputs()
      .every((i) => i.props.name === undefined && i.props.type === "file"),
  );
  assert.ok(m.buttons().every((b) => b.props.type === "button"));
});
test("Reemplazo revoca solo la foto anterior; cancelar y desmontar eliminan vista previa", async () => {
  const m = mount();
  m.open();
  const a = m.select(file());
  m.pending[0].resolve({ url: "blob:first", width: 800, height: 600 });
  await a;
  assert.equal(m.images()[0].props.src, "blob:first");
  const b = m.select(file());
  m.pending[1].resolve({ url: "blob:second", width: 800, height: 600 });
  await b;
  assert.deepEqual(m.revoked, ["blob:first"]);
  m.cancel();
  assert.deepEqual(m.revoked, ["blob:first", "blob:second"]);
  assert.equal(m.images().length, 0);
  m.open();
  assert.equal(m.images().length, 0);
  const c = m.select(file());
  m.pending[2].resolve({ url: "blob:third", width: 800, height: 600 });
  await c;
  m.unmount();
  assert.deepEqual(m.revoked, ["blob:first", "blob:second", "blob:third"]);
});
test("Cancelar durante preparación o desmontar descarta y revoca resultado tardío", async () => {
  for (const action of ["cancel", "unmount"]) {
    const m = mount();
    m.open();
    const request = m.select(file());
    m[action]();
    m.pending[0].resolve({ url: "blob:late", width: 800, height: 600 });
    await request;
    assert.deepEqual(m.revoked, ["blob:late"]);
    assert.equal(m.images().length, 0);
  }
});
test("Error al reemplazar conserva foto previa; cancelar selector no borra foto válida", async () => {
  const m = mount();
  m.open();
  const a = m.select(file());
  m.pending[0].resolve({ url: "blob:valid", width: 800, height: 600 });
  await a;
  await m.select(undefined);
  assert.equal(m.pending.length, 1);
  const b = m.select(file());
  m.pending[1].reject(Error("Formato inválido"));
  await b;
  assert.equal(m.images()[0].props.src, "blob:valid");
  assert.equal(m.alerts().length, 1);
  assert.deepEqual(m.revoked, []);
});

test("Avisos de resolución son independientes de orientación y no garantizan legibilidad", () => {
  const p = processor();
  assert.equal(p.registrationImageWarnings(1600, 1100).length, 0);
  assert.equal(p.registrationImageWarnings(600, 400).length, 1);
  assert.equal(
    JSON.stringify(p.registrationImageWarnings(600, 400)),
    JSON.stringify(p.registrationImageWarnings(400, 600)),
  );
  assert.ok(
    p.registrationImageWarnings(6000, 200).some((s) => s.includes("alargada")),
  );
  assert.ok(
    p.registrationImageWarnings(4000, 3000).some((s) => s.includes("memoria")),
  );
});
test("Lado extremo se rechaza sin conservar URL", async () => {
  const p = processor({ width: 13000, height: 100 });
  await assert.rejects(() => p.preparePrivateRegistrationImage(file()));
  assert.deepEqual(p.revoked, ["blob:private-1"]);
});
function rotationProcessor(fail = false) {
  const calls = [],
    sources = [],
    urls = [],
    revoked = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        translate: (...p) => calls.push(["translate", ...p]),
        rotate: (angle) => calls.push(["rotate", angle]),
        drawImage: (...p) => calls.push(["draw", ...p.slice(1)]),
        imageSmoothingEnabled: true,
      };
    },
    toBlob(callback, mime) {
      calls.push(["encoding", mime, this.width, this.height]);
      callback(fail ? null : { type: mime });
    },
  };
  const service = compile(
    "features/vehiculos/services/privateRegistrationImage.ts",
    () => {
      throw Error("Unexpected dependency");
    },
    {
      URL: {
        createObjectURL(blob) {
          urls.push(blob);
          return "blob:work-" + urls.length;
        },
        revokeObjectURL: (url) => revoked.push(url),
      },
      Image: class {
        set src(url) {
          sources.push(url);
        }
        async decode() {}
      },
      document: {
        createElement(tag) {
          assert.equal(tag, "canvas");
          return canvas;
        },
      },
    },
  );
  return { ...service, calls, sources, urls, revoked, canvas };
}
test("Giros 90, 180 y 270 usan el original, dimensiones exactas y PNG sin escalado", async () => {
  const p = rotationProcessor(),
    original = { url: "blob:original", width: 1200, height: 800 };
  for (const turns of [1, 2, 3]) {
    const result = await p.rotatePrivateRegistrationImage(original, turns);
    assert.equal(result.width, turns % 2 ? 800 : 1200);
    assert.equal(result.height, turns % 2 ? 1200 : 800);
  }
  assert.deepEqual(p.sources.filter(Boolean), [
    "blob:original",
    "blob:original",
    "blob:original",
  ]);
  assert.ok(
    p.calls
      .filter((c) => c[0] === "draw")
      .every((c) => c.length === 3 && c[1] === 0 && c[2] === 0),
  );
  assert.ok(
    p.calls
      .filter((c) => c[0] === "encoding")
      .every((c) => c[1] === "image/png"),
  );
  assert.equal(p.canvas.width, 0);
  assert.equal(p.canvas.height, 0);
  assert.equal(
    (await p.rotatePrivateRegistrationImage(original, 4)).url,
    original.url,
  );
  assert.equal(p.urls.length, 3);
  assert.equal(p.revoked.length, 0);
});
test("Un giro fallido no toca el original y libera el canvas", async () => {
  const p = rotationProcessor(true),
    original = { url: "blob:original", width: 1200, height: 800 };
  await assert.rejects(() => p.rotatePrivateRegistrationImage(original, 1));
  assert.equal(p.canvas.width, 0);
  assert.equal(p.canvas.height, 0);
  assert.equal(p.urls.length, 0);
  assert.equal(original.url, "blob:original");
  await assert.rejects(() => p.rotatePrivateRegistrationImage(original, 1.5));
});

test("Giros visuales 90/180/270, cuatro giros y restauración reutilizan URL sin codificar", async () => {
  const m = mount();
  m.open();
  const first = m.select(file());
  m.pending[0].resolve({ url: "blob:original", width: 1200, height: 800 });
  await first;
  // Invoke the same handler repeatedly before a render, as with batched events.
  const click = m
    .buttons()
    .find((n) => n.props.children === "Girar 90° a la derecha").props.onClick;
  for (const angle of [90, 180, 270, 0]) {
    click();
    assert.equal(m.images()[0].props.src, "blob:original");
    assert.equal(
      m.images()[0].props.style.transform,
      `translate(-50%, -50%) rotate(${angle}deg)`,
    );
    assert.equal(
      m.images()[0].props.style.width,
      angle % 180 ? "150%" : "100%",
    );
  }
  m.buttons()
    .find((n) => n.props.children === "Girar 90° a la izquierda")
    .props.onClick();
  assert.ok(m.images()[0].props.style.transform.includes("270deg"));
  m.buttons()
    .find((n) => n.props.children === "Restaurar orientación original")
    .props.onClick();
  assert.ok(m.images()[0].props.style.transform.includes("0deg"));
  assert.equal(m.rotations.length, 0);
  assert.deepEqual(m.revoked, []);
  m.cancel();
  assert.deepEqual(m.revoked, ["blob:original"]);
});

test("Miniatura limitada a 1024 se genera desde original, sin modificarlo ni reducir el trabajo OCR", async () => {
  const p = rotationProcessor();
  const original = Object.freeze({
    url: "blob:original",
    width: 4000,
    height: 3000,
  });
  const preview = await p.createPrivateRegistrationPreview(original);
  assert.equal(preview.width, 1024);
  assert.equal(preview.height, 768);
  assert.deepEqual(
    p.calls.find((c) => c[0] === "draw"),
    ["draw", 0, 0, 1024, 768],
  );
  assert.equal(p.canvas.width, 0);
  assert.equal(p.canvas.height, 0);
  const work = await p.rotatePrivateRegistrationImage(original, 1);
  assert.equal(work.width, 3000);
  assert.equal(work.height, 4000);
  assert.equal(original.width, 4000);
  assert.equal(original.url, "blob:original");
  const small = { url: "blob:small", width: 800, height: 600 };
  assert.equal(await p.createPrivateRegistrationPreview(small), small);
});

test("Cancelar o desmontar durante miniatura descarta ambos recursos tardíos", async () => {
  for (const action of ["cancel", "unmount"]) {
    const m = mount(true);
    m.open();
    const request = m.select(file());
    m.pending[0].resolve({ url: "blob:original", width: 4000, height: 3000 });
    await new Promise(setImmediate);
    m[action]();
    m.thumbnails[0].resolve({
      url: "blob:thumbnail",
      width: 1024,
      height: 768,
    });
    await request;
    assert.deepEqual(m.revoked, ["blob:original", "blob:thumbnail"]);
    assert.equal(m.images().length, 0);
  }
});

test("Reemplazo conserva foto válida hasta completar miniatura y libera original/vista previa", async () => {
  const m = mount(true);
  m.open();
  const a = m.select(file());
  m.pending[0].resolve({ url: "blob:first", width: 4000, height: 3000 });
  await new Promise(setImmediate);
  m.thumbnails[0].resolve({
    url: "blob:thumb-first",
    width: 1024,
    height: 768,
  });
  await a;
  m.rotate();
  const b = m.select(file());
  m.pending[1].resolve({ url: "blob:failed", width: 4000, height: 3000 });
  await new Promise(setImmediate);
  m.thumbnails[1].reject(Error("memoria"));
  await b;
  assert.equal(m.images()[0].props.src, "blob:thumb-first");
  assert.ok(m.images()[0].props.style.transform.includes("90deg"));
  assert.deepEqual(m.revoked, ["blob:failed"]);
  const c = m.select(file());
  m.pending[2].resolve({ url: "blob:second", width: 4000, height: 3000 });
  await new Promise(setImmediate);
  m.thumbnails[2].resolve({
    url: "blob:thumb-second",
    width: 1024,
    height: 768,
  });
  await c;
  assert.equal(m.images()[0].props.src, "blob:thumb-second");
  assert.ok(m.images()[0].props.style.transform.includes("0deg"));
  assert.deepEqual(m.revoked, [
    "blob:failed",
    "blob:thumb-first",
    "blob:first",
  ]);
  m.unmount();
  assert.deepEqual(m.revoked.slice(-2), ["blob:thumb-second", "blob:second"]);
});

test("Fallo al codificar miniatura libera canvas y no crea ni revoca original", async () => {
  const p = rotationProcessor(true);
  await assert.rejects(() =>
    p.createPrivateRegistrationPreview({
      url: "blob:original",
      width: 4000,
      height: 3000,
    }),
  );
  assert.equal(p.canvas.width, 0);
  assert.equal(p.canvas.height, 0);
  assert.equal(p.urls.length, 0);
  assert.deepEqual(p.revoked, []);
});

function preparationController(compatible = true, fakeTimeout = false) {
  let timeout;
  const workers = [];
  class FakeWorker {
    constructor(path) {
      this.path = path;
      this.messages = [];
      this.terminated = false;
      workers.push(this);
    }
    postMessage(data) {
      this.messages.push(data);
    }
    terminate() {
      this.terminated = true;
    }
    emit(data) {
      this.onmessage?.({ data });
    }
  }
  const service = compile(
    "features/vehiculos/services/privateImagePreparation.ts",
    () => cropGeometry,
    {
      ...(fakeTimeout
        ? {
            setTimeout: (callback) => {
              timeout = callback;
              return 1;
            },
            clearTimeout: () => {
              timeout = undefined;
            },
          }
        : {}),
      Worker: compatible ? FakeWorker : undefined,
      OffscreenCanvas: class {},
      createImageBitmap() {},
      Blob,
    },
  );
  return { ...service, workers, expire: () => timeout?.() };
}
const preparationInput = () =>
  new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });

test("Worker local: handshake, original Blob, dimensiones completas y terminación después del resultado", async () => {
  const p = preparationController(),
    controller = new p.PrivateImagePreparation(),
    file = preparationInput();
  const job = controller.prepare(file, 1, 4000, 3000),
    w = p.workers[0];
  assert.equal(w.path, "/workers/private-registration-image.js");
  assert.equal(w.messages.length, 0);
  w.emit({ kind: "READY", compatible: true });
  w.emit({ kind: "READY", compatible: true });
  assert.equal(w.messages.length, 1);
  assert.equal(w.messages[0].file, file);
  const id = w.messages[0].id,
    blob = preparationInput();
  w.emit({ kind: "RESULT", id, blob, ...w.messages[0].plan.output });
  const result = await job;
  assert.equal(result.blob, blob);
  assert.equal(w.terminated, true);
});

test("Cancelación y trabajos repetidos: un worker activo, respuestas antiguas no resuelven la operación nueva", async () => {
  const p = preparationController(),
    c = new p.PrivateImagePreparation();
  const first = c.prepare(preparationInput(), 0, 1200, 800);
  const rejected = assert.rejects(first, /CANCELLED/);
  const a = p.workers[0];
  a.emit({ kind: "READY", compatible: true });
  const second = c.prepare(preparationInput(), 2, 1200, 800);
  await rejected;
  assert.equal(a.terminated, true);
  const b = p.workers[1];
  b.emit({ kind: "READY", compatible: true });
  a.emit({
    kind: "RESULT",
    id: a.messages[0].id,
    blob: preparationInput(),
    width: 1200,
    height: 800,
  });
  assert.equal(b.terminated, false);
  b.emit({
    kind: "RESULT",
    id: b.messages[0].id,
    blob: preparationInput(),
    width: 1200,
    height: 800,
  });
  await second;
  const third = c.prepare(preparationInput(), 0, 1200, 800);
  const aborted = assert.rejects(third, /CANCELLED/);
  c.cancel();
  await aborted;
  assert.ok(p.workers.every((w) => w.terminated));
});

test("Sin compatibilidad o soporte real del worker: rechazo explícito sin fallback pesado", async () => {
  const no = preparationController(false);
  await assert.rejects(
    new no.PrivateImagePreparation().prepare(preparationInput(), 0, 1200, 800),
    /manual/,
  );
  assert.equal(no.workers.length, 0);
  const p = preparationController(),
    c = new p.PrivateImagePreparation(),
    job = c.prepare(preparationInput(), 0, 1200, 800);
  p.workers[0].emit({ kind: "READY", compatible: false });
  await assert.rejects(job, /manual/);
  assert.equal(p.workers[0].terminated, true);
});

test("Resultado con tamaño inesperado se rechaza y errores del navegador no filtran contenido", async () => {
  const p = preparationController(),
    c = new p.PrivateImagePreparation();
  const first = c.prepare(preparationInput(), 1, 1200, 800),
    a = p.workers[0];
  a.emit({ kind: "READY", compatible: true });
  a.emit({
    kind: "RESULT",
    id: a.messages[0].id,
    blob: preparationInput(),
    width: 1024,
    height: 683,
  });
  await assert.rejects(first, /no coincide/);
  const second = c.prepare(preparationInput(), 0, 1200, 800),
    b = p.workers[1];
  b.onerror({ message: "private-document-value", preventDefault() {} });
  await assert.rejects(
    second,
    (e) => !e.message.includes("private-document-value"),
  );
  assert.ok(p.workers.every((w) => w.terminated));
});

function workerRuntime({
  compatible = true,
  failure = false,
  width = 1200,
  height = 800,
} = {}) {
  const messages = [],
    calls = [],
    canvases = [];
  let closeCount = 0;
  class Canvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      canvases.push(this);
    }
    getContext() {
      return {
        translate: (...v) => calls.push(["translate", ...v]),
        rotate: (v) => calls.push(["rotate", v]),
        drawImage: (...v) => calls.push(["draw", ...v.slice(1)]),
      };
    }
    async convertToBlob() {
      calls.push(["encode"]);
      assert.equal(calls.at(-2)[0], "close-bitmap");
      if (failure) throw Error("private-metadata");
      return preparationInput();
    }
  }
  const scope = {
    self: {
      postMessage: (data) => {
        if (data.kind === "RESULT")
          assert.ok(canvases.every((c) => c.width === 0 && c.height === 0));
        messages.push(data);
      },
    },
    Blob,
    OffscreenCanvas: compatible ? Canvas : undefined,
    createImageBitmap: async (file, options) => {
      assert.equal(options.imageOrientation, "from-image");
      calls.push(["decode"]);
      return {
        width,
        height,
        close() {
          closeCount++;
          calls.push(["close-bitmap"]);
        },
      };
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(root, "public/workers/private-registration-image.js"),
      "utf8",
    ),
    scope,
  );
  return { scope, messages, calls, canvases, closed: () => closeCount };
}
test("Runtime worker: 0/90/180/270 no escalan, cierran bitmap y liberan canvas", async () => {
  const p = workerRuntime();
  assert.equal(p.messages[0].compatible, true);
  for (const turns of [0, 1, 2, 3]) {
    await p.scope.self.onmessage({
      data: {
        kind: "PREPARE",
        id: turns + 1,
        file: preparationInput(),
        plan: cropGeometry.registrationPreparationPlan(
          1200,
          800,
          turns,
          cropGeometry.FULL_REGISTRATION_CROP,
        ),
      },
    });
    const r = p.messages.at(-1);
    assert.equal(r.kind, "RESULT");
    assert.equal(r.width, turns % 2 ? 800 : 1200);
    assert.equal(r.height, turns % 2 ? 1200 : 800);
  }
  assert.equal(p.closed(), 4);
  assert.ok(p.canvases.every((c) => c.width === 0 && c.height === 0));
  assert.ok(
    p.calls
      .filter((c) => c[0] === "draw")
      .every((c) => c.length === 9 && c[3] === c[7] && c[4] === c[8]),
  );
});
test("Runtime worker: fallo y falta de soporte no exponen contenido y liberan recursos", async () => {
  const p = workerRuntime({ failure: true });
  await p.scope.self.onmessage({
    data: {
      kind: "PREPARE",
      id: 1,
      file: preparationInput(),
      plan: cropGeometry.registrationPreparationPlan(
        1200,
        800,
        1,
        cropGeometry.FULL_REGISTRATION_CROP,
      ),
    },
  });
  assert.equal(p.messages.at(-1).code, "PREPARATION_FAILED");
  assert.ok(!JSON.stringify(p.messages).includes("private-metadata"));
  assert.equal(p.closed(), 1);
  assert.ok(p.canvases.every((c) => c.width === 0 && c.height === 0));
  const no = workerRuntime({ compatible: false });
  assert.equal(no.messages[0].compatible, false);
});

test("Captura: preparación explícita usa el archivo original, giro invalida resultado tardío", async () => {
  const m = mount();
  m.open();
  const input = file(),
    select = m.select(input);
  m.pending[0].resolve({ url: "blob:original", width: 4000, height: 3000 });
  await select;
  assert.equal(m.preparations.length, 0);
  const job = m.prepare();
  assert.equal(m.preparations[0].args[0], input);
  assert.deepEqual(m.preparations[0].args.slice(1, 4), [0, 4000, 3000]);
  m.rotate();
  m.preparations[0].resolve({
    blob: preparationInput(),
    width: 4000,
    height: 3000,
  });
  await job;
  assert.ok(
    !JSON.stringify(m.statuses()).includes("Imagen preparada localmente"),
  );
  assert.ok(m.preparationCancels.length);
  const again = m.prepare();
  assert.equal(m.preparations[1].args[1], 1);
  m.preparations[1].resolve({
    blob: preparationInput(),
    width: 3000,
    height: 4000,
  });
  await again;
  assert.ok(
    JSON.stringify(m.statuses()).includes("Imagen preparada localmente"),
  );
});

test("Captura: reemplazar/cancelar/desmontar invalidan la preparación y no aceptan resultados tardíos", async () => {
  for (const action of ["replace", "cancel", "unmount"]) {
    const m = mount();
    m.open();
    const a = m.select(file());
    m.pending[0].resolve({ url: "blob:first", width: 1200, height: 800 });
    await a;
    const job = m.prepare();
    if (action === "replace") {
      const next = m.select(file());
      m.pending[1].resolve({ url: "blob:second", width: 1200, height: 800 });
      await next;
    } else m[action]();
    m.preparations[0].resolve({
      blob: preparationInput(),
      width: 1200,
      height: 800,
    });
    await job;
    assert.ok(
      !JSON.stringify(m.statuses()).includes("Imagen preparada localmente"),
    );
    assert.ok(m.preparationCancels.length);
  }
});
test("Captura sin compatibilidad conserva el flujo manual y no ofrece preparar", async () => {
  const m = mount(false, false);
  m.open();
  const a = m.select(file());
  m.pending[0].resolve({ url: "blob:first", width: 1200, height: 800 });
  await a;
  assert.ok(JSON.stringify(m.statuses()).includes("manual"));
  assert.ok(
    !m
      .buttons()
      .some((b) => b.props.children === "Preparar imagen para reconocimiento"),
  );
  assert.equal(m.images()[0].props.src, "blob:first");
  m.rotate();
  assert.ok(m.images()[0].props.style.transform.includes("90deg"));
});

test("Preparación sin respuesta termina por timeout; límites inválidos no crean worker", async () => {
  const p = preparationController(true, true),
    c = new p.PrivateImagePreparation();
  const job = c.prepare(preparationInput(), 0, 1200, 800);
  p.expire();
  await assert.rejects(job, /tardó demasiado/);
  assert.equal(p.workers[0].terminated, true);
  assert.equal(p.workers[0].onmessage, null);
  for (const [turns, width, height] of [
    [1.5, 1200, 800],
    [4, 1200, 800],
    [0, 6000, 5000],
    [0, 0, 800],
  ])
    await assert.rejects(
      c.prepare(preparationInput(), turns, width, height),
      /no es válida/,
    );
  assert.equal(p.workers.length, 1);
});

test("Recorte: la preparación exige confirmación y editar/cancelar la retiran", async () => {
  const m = mount();
  m.open();
  const a = m.select(file());
  m.pending[0].resolve({ url: "blob:original", width: 4000, height: 3000 });
  await a;
  let button = m
    .buttons()
    .find((b) => b.props.children === "Preparar imagen para reconocimiento");
  assert.equal(button.props.disabled, true);
  await button.props.onClick();
  assert.equal(m.preparations.length, 0);
  m.confirm();
  assert.equal(
    m
      .buttons()
      .find((b) => b.props.children === "Preparar imagen para reconocimiento")
      .props.disabled,
    false,
  );
  m.ranges()
    .find((n) => n.props["aria-label"] === "Ancho del recorte (%)")
    .props.onChange({ target: { value: "70" } });
  assert.equal(
    m
      .buttons()
      .find((b) => b.props.children === "Preparar imagen para reconocimiento")
      .props.disabled,
    true,
  );
  m.confirm();
  const job = m
    .buttons()
    .find((b) => b.props.children === "Preparar imagen para reconocimiento")
    .props.onClick();
  assert.equal(m.preparations[0].args[4].width, 0.7);
  m.buttons()
    .find((b) => b.props.children === "Cancelar recorte")
    .props.onClick();
  m.preparations[0].resolve({
    blob: preparationInput(),
    width: 100,
    height: 100,
  });
  await job;
  assert.ok(
    !JSON.stringify(m.statuses()).includes("Imagen preparada localmente"),
  );
});

test("Plan de recorte: inversa exacta en horizontal/vertical y cuatro giros", () => {
  for (const [W, H] of [
    [80, 50],
    [50, 80],
  ])
    for (const t of [0, 1, 2, 3]) {
      const crop = { left: 0.2, top: 0.2, width: 0.6, height: 0.6 },
        p = cropGeometry.registrationPreparationPlan(W, H, t, crop),
        OW = t % 2 ? H : W,
        OH = t % 2 ? W : H;
      const x0 = Math.floor(crop.left * OW),
        y0 = Math.floor(crop.top * OH),
        x1 = Math.ceil((crop.left + crop.width) * OW),
        y1 = Math.ceil((crop.top + crop.height) * OH);
      const expected = [];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const ox =
              t === 0 ? x : t === 1 ? H - 1 - y : t === 2 ? W - 1 - x : y,
            oy = t === 0 ? y : t === 1 ? x : t === 2 ? H - 1 - y : W - 1 - x;
          if (ox >= x0 && ox < x1 && oy >= y0 && oy < y1)
            expected.push(y * W + x);
        }
      const actual = [];
      for (let y = p.source.top; y < p.source.top + p.source.height; y++)
        for (let x = p.source.left; x < p.source.left + p.source.width; x++)
          actual.push(y * W + x);
      assert.deepEqual(actual, expected);
      assert.equal(p.output.width, x1 - x0);
      assert.equal(p.output.height, y1 - y0);
      assert.equal(p.reduced, false);
    }
});
test("Plan limita 12/24 MP a 3,2 MP sin ampliar ni deformar, rechaza NaN y fuera de límites", () => {
  for (const [W, H] of [
    [4000, 3000],
    [6000, 4000],
    [4000, 6000],
    [1200, 800],
  ])
    for (const t of [0, 1, 2, 3]) {
      const p = cropGeometry.registrationPreparationPlan(
          W,
          H,
          t,
          cropGeometry.FULL_REGISTRATION_CROP,
        ),
        cw = t % 2 ? H : W,
        ch = t % 2 ? W : H;
      assert.ok(p.output.width * p.output.height <= 3200000);
      assert.ok(p.output.width <= cw && p.output.height <= ch);
      assert.ok(
        Math.abs(p.output.width * ch - p.output.height * cw) <= cw + ch,
      );
    }
  for (const crop of [
    { left: NaN, top: 0, width: 1, height: 1 },
    { left: -0.1, top: 0, width: 1, height: 1 },
    { left: 0.5, top: 0, width: 0.6, height: 1 },
    { left: 0, top: 0, width: 0, height: 1 },
  ])
    assert.throws(() =>
      cropGeometry.registrationPreparationPlan(4000, 3000, 0, crop),
    );
});
test("Worker optimizado solicita solo ROI/tamaño objetivo y libera antes de publicar PNG", async () => {
  const p = workerRuntime({ width: 4000, height: 3000 }),
    plan = cropGeometry.registrationPreparationPlan(4000, 3000, 1, {
      left: 0.1,
      top: 0.2,
      width: 0.7,
      height: 0.6,
    });
  await p.scope.self.onmessage({
    data: { kind: "PREPARE", id: 1, file: preparationInput(), plan },
  });
  assert.equal(p.messages.at(-1).kind, "RESULT");
  const d = p.calls.find((c) => c[0] === "draw");
  assert.deepEqual(d.slice(1, 5), [
    plan.source.left,
    plan.source.top,
    plan.source.width,
    plan.source.height,
  ]);
  assert.ok(d[7] * d[8] <= 3200000);
  assert.equal(p.closed(), 1);
  const invalid = { ...plan, output: { width: 4000, height: 3000 } };
  await p.scope.self.onmessage({
    data: { kind: "PREPARE", id: 2, file: preparationInput(), plan: invalid },
  });
  assert.equal(p.messages.at(-1).kind, "ERROR");
});
