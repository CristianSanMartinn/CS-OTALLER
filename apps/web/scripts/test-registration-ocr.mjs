import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function compile(file, require = () => ({}), extras = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require,
      setTimeout,
      clearTimeout,
      Blob,
      Uint8Array,
      WebAssembly,
      ...extras,
    },
  );
  return module.exports;
}
const extraction = compile(
  "features/vehiculos/services/registrationExtraction.ts",
);
const word = (text, x, y, confidence = 96) => ({
  text,
  confidence,
  bbox: { x0: x, y0: y, x1: x + text.length * 9, y1: y + 18 },
});
const row = (label, value, y, x = 0) => [
  word(label, x, y),
  ...value
    .split(" ")
    .filter(Boolean)
    .map((v, i, all) =>
      word(v, x + 220 + all.slice(0, i).join(" ").length * 9 + (i ? 9 : 0), y),
    ),
];
const extract = (words) => extraction.extractRegistrationDraft(words, 2026);
const candidate = (d, key) => d.fields[key].candidates.map((c) => c.value);
test("Borrador independiente: ocho campos, estado inicial no analizado; sin propiedades personales", () => {
  const d = extraction.emptyRegistrationDraft();
  assert.equal(Object.keys(d.fields).length, 8);
  assert.ok(Object.values(d.fields).every((f) => f.state === "NOT_ANALYZED"));
  assert.equal(d.ownerId, undefined);
});
test("Etiqueta y valor por coordenadas, no por concatenación o posición en el array", () => {
  const words = [
    ...row("PATENTE:", "ABCD12", 20),
    ...row("MARCA:", "MARCA FICTICIA", 60),
    ...row("MODELO:", "MODELO UNO", 100),
    ...row("AÑO MODELO:", "2020", 140),
    ...row("AÑO FABRICACIÓN:", "2019", 180),
  ].reverse();
  const d = extract(words);
  for (const [key, val] of Object.entries({
    plate: "ABCD12",
    brand: "MARCA FICTICIA",
    model: "MODELO UNO",
    modelYear: "2020",
    manufacturingYear: "2019",
  }))
    assert.equal(candidate(d, key)[0], val);
});
test("Columnas: valores del motor, chasis y VIN permanecen separados", () => {
  const words = [
    ...row("NRO MOTOR:", "MOT0R001", 20),
    ...row("NRO CHASIS:", "CHASIS123", 60),
    ...row("VIN:", "ZZZTEST0000000001", 100),
  ];
  const d = extract(words);
  assert.equal(candidate(d, "engineNumber")[0], "MOT0R001");
  assert.equal(candidate(d, "chassisNumber")[0], "CHASIS123");
  assert.equal(candidate(d, "vin")[0], "ZZZTEST0000000001");
});
test("Dos etiquetas en la misma fila no absorben valores de la columna vecina", () => {
  const words = [
    word("MARCA:", 0, 20),
    word("FICTICIA", 100, 20),
    word("MODELO:", 300, 20),
    word("UNO", 420, 20),
  ];
  const d = extract(words);
  assert.equal(candidate(d, "brand")[0], "FICTICIA");
  assert.equal(candidate(d, "model")[0], "UNO");
});
test("Valor inmediatamente debajo en su columna; no cruza otra etiqueta", () => {
  const d = extract([
    word("MARCA:", 10, 10),
    word("FICTICIA", 10, 40),
    word("MODELO:", 10, 80),
    word("VIN:", 10, 110),
  ]);
  assert.equal(candidate(d, "brand")[0], "FICTICIA");
  assert.equal(d.fields.model.state, "ILLEGIBLE");
});
test("Ausentes no se inventan; etiqueta vacía es ilegible; texto sin etiquetas no se interpreta", () => {
  const d = extract([
    word("PATENTE:", 0, 10),
    word("MARCA:", 0, 50),
    word("RUIDO", 700, 500),
  ]);
  assert.equal(d.fields.plate.state, "ILLEGIBLE");
  assert.equal(d.fields.vin.state, "ABSENT");
  assert.equal(candidate(d, "plate").length, 0);
});
test("Duplicados contradictorios requieren revisión; no selecciona un candidato", () => {
  const d = extract([
    ...row("PATENTE:", "ABCD12", 20),
    ...row("PATENTE:", "WXYZ34", 70),
  ]);
  assert.equal(d.fields.plate.state, "DOUBTFUL");
  assert.equal(candidate(d, "plate").length, 2);
});
test("Confusiones 0/O, I/1: conserva literalmente, no corrige; baja confianza es dudosa", () => {
  const d = extract([
    ...row("PATENTE:", "ABCDI2", 20),
    ...row("VIN:", "ZZZTESTOOOOOOOOOOI", 60),
    ...row("NRO MOTOR:", "O0I1-AB", 100).map((w) => ({ ...w, confidence: 45 })),
  ]);
  assert.equal(candidate(d, "plate")[0], "ABCDI2");
  assert.equal(d.fields.plate.state, "DOUBTFUL");
  assert.equal(candidate(d, "engineNumber")[0], "O0I1-AB");
  assert.equal(d.fields.engineNumber.state, "DOUBTFUL");
  assert.equal(d.fields.vin.state, "DOUBTFUL");
});
test("Año genérico no equivale automáticamente a año-modelo ni fabricación", () => {
  const d = extract(row("AÑO:", "2020", 10));
  assert.equal(d.fields.modelYear.state, "ABSENT");
  assert.equal(d.fields.manufacturingYear.state, "ABSENT");
});
test("Descripción MOTOR no se confunde con número de motor ni VIN con chasis", () => {
  const d = extract([
    ...row("MOTOR:", "2.0 DIESEL", 10),
    ...row("CHASIS:", "XX123", 50),
  ]);
  assert.equal(d.fields.engineNumber.state, "ABSENT");
  assert.equal(d.fields.vin.state, "ABSENT");
});
test("Datos personales vecinos no salen en borrador ni en procedencia", () => {
  const d = extract([
    ...row("MARCA:", "FICTICIA", 10),
    ...row("PROPIETARIO:", "PERSONA PRIVADA", 50),
    ...row("RUT:", "12.345.678-9", 90),
    ...row("DIRECCIÓN:", "CALLE PRIVADA 99", 130),
    word("VIN:", 0, 170),
    word("NOMBRE:", 0, 200),
    word("OTRA PERSONA", 220, 200),
  ]);
  const serialized = JSON.stringify(d);
  for (const value of [
    "PERSONA",
    "PRIVADA",
    "12.345.678",
    "CALLE",
    "NOMBRE",
    "PROPIETARIO",
  ])
    assert.ok(!serialized.includes(value));
  assert.equal(d.fields.vin.state, "ILLEGIBLE");
});
test("Valor contaminado con correo o RUT se descarta", () => {
  for (const value of ["persona@example.test", "12.345.678-9"]) {
    const d = extract(row("MODELO:", value, 20));
    assert.equal(d.fields.model.state, "ILLEGIBLE");
    assert.equal(candidate(d, "model").length, 0);
  }
});
test("Límites defensivos: no acepta miles de palabras ni cajas no finitas", () => {
  assert.throws(() =>
    extract(Array.from({ length: 4001 }, () => word("X", 0, 0))),
  );
  const d = extract([
    { ...word("VIN:", 0, 0), bbox: { x0: NaN, y0: 0, x1: 10, y1: 10 } },
  ]);
  assert.equal(d.fields.vin.state, "ABSENT");
});

function service() {
  const workers = [],
    timers = [];
  class MockWorker {
    constructor(url) {
      this.url = url;
      this.messages = [];
      this.terminated = false;
      workers.push(this);
    }
    postMessage(message, transfer) {
      this.messages.push({ message, transfer });
    }
    terminate() {
      this.terminated = true;
    }
    reply(status = "resolve", data = {}) {
      const { message } = this.messages.at(-1);
      this.onmessage?.({ data: { ...message, status, data } });
    }
  }
  const api = compile(
    "features/vehiculos/services/privateRegistrationRecognition.ts",
    () => extraction,
    {
      Worker: MockWorker,
      setTimeout(fn) {
        timers.push(fn);
        return timers.length;
      },
      clearTimeout() {},
    },
  );
  return { runner: new api.PrivateRegistrationRecognition(), workers, timers };
}
const image = () => ({
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
  width: 100,
  height: 100,
});
async function reachOcr(worker) {
  for (let i = 0; i < 4; i++) worker.reply();
  await new Promise((r) => setImmediate(r));
}
test("Protocolo 7.0.0 local spa+eng, sin cache, transferencia PNG; termina al completar", async () => {
  const { runner, workers } = service(),
    p = runner.recognize(image()),
    w = workers[0];
  await reachOcr(w);
  assert.equal(w.url, "/workers/private-registration-ocr.js");
  assert.deepEqual(
    w.messages.map((m) => m.message.action),
    ["load", "loadLanguage", "initialize", "setParameters", "recognize"],
  );
  assert.equal(w.messages[1].message.payload.options.cacheMethod, "none");
  assert.equal(w.messages[1].message.payload.langs, "spa+eng");
  assert.equal(w.messages[4].transfer.length, 1);
  assert.equal(w.messages[4].message.payload.output.text, false);
  w.reply("resolve", {
    blocks: [
      { paragraphs: [{ lines: [{ words: row("PATENTE:", "ABCD12", 10) }] }] },
    ],
  });
  const d = await p;
  assert.equal(candidate(d, "plate")[0], "ABCD12");
  assert.ok(w.terminated);
});
test("Cancelación real durante carga; mensajes tardíos no resuelven ni generan nuevo trabajo", async () => {
  const { runner, workers } = service();
  const p = runner.recognize(image());
  const rejected = assert.rejects(p, /OCR_CANCELLED/);
  const w = workers[0],
    late = w.onmessage;
  runner.cancel();
  await rejected;
  assert.ok(w.terminated);
  late({ data: { ...w.messages[0].message, status: "resolve", data: {} } });
  assert.equal(w.messages.length, 1);
});
test("Una operación activa: iniciar otra termina anterior y no mezcla resultados", async () => {
  const { runner, workers } = service();
  const p1 = runner.recognize(image());
  const rejected = assert.rejects(p1, /OCR_CANCELLED/);
  const p2 = runner.recognize(image());
  await rejected;
  assert.ok(workers[0].terminated);
  await reachOcr(workers[1]);
  workers[1].reply("resolve", { blocks: [] });
  const d = await p2;
  assert.equal(d.fields.plate.state, "ABSENT");
  assert.ok(workers.every((w) => w.terminated));
});
test("Timeout y fallo del worker sanitizados, sin exponer texto de error", async () => {
  for (const mode of ["timeout", "reject", "error"]) {
    const { runner, workers, timers } = service(),
      p = runner.recognize(image()),
      w = workers[0];
    const rejected = assert.rejects(
      p,
      (e) => !e.message.includes("PERSONA PRIVADA"),
    );
    if (mode === "timeout") timers[0]();
    else if (mode === "reject") w.reply("reject", "PERSONA PRIVADA");
    else w.onerror({ preventDefault() {} });
    await rejected;
    assert.ok(w.terminated);
  }
});
test("PNG máximo 3,2MP; incompatibilidad o imagen inválida no inicia OCR", async () => {
  const { runner, workers } = service();
  for (const item of [
    { ...image(), width: 4000, height: 3000 },
    { ...image(), blob: new Blob(["x"], { type: "image/jpeg" }) },
    { ...image(), width: 0 },
  ])
    await assert.rejects(runner.recognize(item));
  assert.equal(workers.length, 0);
  const api = compile(
    "features/vehiculos/services/privateRegistrationRecognition.ts",
    () => extraction,
    { Worker: undefined },
  );
  await assert.rejects(
    new api.PrivateRegistrationRecognition().recognize(image()),
  );
});
test("Bootstrap impide egress, no logs, no documentos en recursos versionados", () => {
  const source = fs.readFileSync(
    path.join(root, "public/workers/private-registration-ocr.js"),
    "utf8",
  );
  assert.ok(source.includes('credentials: "omit"'));
  assert.ok(source.includes("LOCAL_RESOURCE_ONLY"));
  assert.ok(source.includes("console[method] = () => {}"));
  const base = path.join(root, "public/ocr/tesseract-7.0.0"),
    manifest = JSON.parse(
      fs.readFileSync(path.join(base, "manifest.json"), "utf8"),
    );
  assert.equal(manifest.tesseract, "7.0.0");
  for (const f of manifest.files)
    assert.equal(fs.statSync(path.join(base, f.file)).size, f.bytes);
});

test("Cancelar DURANTE recognize y descartar su respuesta tardía termina el worker", async () => {
  const { runner, workers } = service();
  const p = runner.recognize(image());
  const rejected = assert.rejects(p, /OCR_CANCELLED/);
  const w = workers[0];
  await reachOcr(w);
  const late = w.onmessage;
  const packet = w.messages.at(-1).message;
  runner.cancel();
  await rejected;
  late({ data: { ...packet, status: "resolve", data: { blocks: [] } } });
  assert.ok(w.terminated);
  assert.equal(w.messages.length, 5);
});
test("Progreso solo expone fase y porcentaje, nunca texto de la respuesta", async () => {
  const { runner, workers } = service(),
    progress = [];
  const p = runner.recognize(image(), (value) => progress.push(value));
  const w = workers[0];
  w.reply("progress", {
    progress: 0.5,
    status: "PERSONA PRIVADA",
    text: "PERSONA PRIVADA",
  });
  runner.cancel();
  await assert.rejects(p);
  assert.ok(!JSON.stringify(progress).includes("PERSONA"));
  assert.equal(progress.at(-1).percent, 50);
});
