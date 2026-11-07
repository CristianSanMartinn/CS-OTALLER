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
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    { module, exports: module.exports, require, ...extras },
  );
  return module.exports;
}
const extraction = compile(
  "features/vehiculos/services/registrationExtraction.ts",
);
const review = compile(
  "features/vehiculos/services/registrationReview.ts",
  () => ({ normalizePlate: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "") }),
);
const candidate = (value, label) => ({
  value,
  confidence: 99,
  source: { label, bounds: { x0: 1, y0: 1, x1: 20, y1: 20 } },
});
function draft() {
  const d = extraction.emptyRegistrationDraft("ABSENT");
  for (const [field, value, label] of [
    ["plate", "ab-cd12", "PATENTE"],
    ["brand", "Marca QA", "MARCA"],
    ["model", "Modelo QA", "MODELO"],
    ["modelYear", "2020", "ANO MODELO"],
    ["manufacturingYear", "2019", "ANO FABRICACION"],
    ["engineNumber", "MOT-123", "NRO MOTOR"],
    ["chassisNumber", "CHASIS123", "NRO CHASIS"],
    ["vin", "ZZZTEST0000000001", "VIN"],
  ])
    d.fields[field] = {
      state: "DETECTED",
      candidates: [candidate(value, label)],
    };
  return d;
}
function accepted(d, ...fields) {
  const r = review.initialRegistrationReviews(d);
  fields.forEach((f) => (r[f].decision = "ACCEPTED"));
  return r;
}
test("Ningún candidato se acepta por confianza, ni siquiera 99 %", () => {
  const d = draft();
  assert.equal(
    Object.keys(
      review.confirmedRegistrationApplication(
        d,
        review.initialRegistrationReviews(d),
      ),
    ).length,
    0,
  );
});
test("Aplicación parcial: solo campos confirmados, corrección explícita y patente normalizada", () => {
  const d = draft(),
    r = accepted(d, "plate", "brand");
  r.brand.value = "Marca corregida";
  const values = review.confirmedRegistrationApplication(d, r);
  assert.deepEqual(
    { ...values },
    { plate: "ABCD12", brand: "Marca corregida" },
  );
});
test("Rechazar elimina un campo de la selección; ambiguos sin elegir no se aplican", () => {
  const d = draft();
  d.fields.plate.candidates.push(candidate("WXYZ34", "PATENTE"));
  const r = accepted(d, "plate", "brand");
  r.brand.decision = "REJECTED";
  assert.deepEqual({ ...review.confirmedRegistrationApplication(d, r) }, {});
  r.plate.candidateIndex = 1;
  r.plate.value = "WXYZ34";
  assert.equal(review.confirmedRegistrationApplication(d, r).plate, "WXYZ34");
});
test("Fabricación, motor y chasis nunca se aplican a year, engine o vin", () => {
  const d = draft();
  assert.deepEqual(
    {
      ...review.confirmedRegistrationApplication(
        d,
        accepted(d, "manufacturingYear", "engineNumber", "chassisNumber"),
      ),
    },
    {},
  );
});
test("Año modelo requiere etiqueta explícita; fabricación e inscripción no son fallback", () => {
  for (const label of ["ANO FABRICACION", "FECHA INSCRIPCION", "ANO"]) {
    const d = draft();
    d.fields.modelYear.candidates[0].source.label = label;
    assert.equal(
      review.confirmedRegistrationApplication(d, accepted(d, "modelYear")).year,
      undefined,
    );
  }
});
test("VIN explícito y compatible; no corrige automáticamente I/O/Q ni chasis", () => {
  for (const [label, value] of [
    ["NRO CHASIS", "ZZZTEST0000000001"],
    ["VIN", "ZZZTESTOOOOOOOOOOI"],
  ]) {
    const d = draft();
    d.fields.vin.candidates = [candidate(value, label)];
    assert.equal(
      review.confirmedRegistrationApplication(d, accepted(d, "vin")).vin,
      undefined,
    );
  }
  const d = draft();
  assert.equal(
    review.confirmedRegistrationApplication(d, accepted(d, "vin")).vin,
    "ZZZTEST0000000001",
  );
});
test("Campos ausentes/ilegibles sin candidato no generan aplicación inventada", () => {
  const d = draft();
  for (const state of ["ABSENT", "ILLEGIBLE"]) {
    d.fields.brand = { state, candidates: [] };
    assert.equal(
      review.confirmedRegistrationApplication(d, accepted(d, "brand")).brand,
      undefined,
    );
  }
});
test("Validación del límite rechaza propietario, kilometraje, engine y claves heredadas", () => {
  for (const values of [
    { ownerId: "x" },
    { mileage: "100" },
    { engine: "MOTOR" },
    { year: "0" },
    { brand: "" },
    { plate: "ab-cd12" },
    JSON.parse('{"__proto__":"x"}'),
  ])
    assert.equal(review.validateRegistrationApplication(values), false);
  assert.equal(
    review.validateRegistrationApplication({ plate: "ABCD12", year: "2020" }),
    true,
  );
});
test("Sobrescrituras y snapshots no confunden blanco con valor confirmado", () => {
  const snapshot = {
    plate: "",
    brand: "Escrita",
    model: "",
    year: "2020",
    vin: "",
  };
  assert.deepEqual(
    [
      ...review.registrationOverwrites(
        { brand: "Nueva", year: "2020", plate: "ABCD12" },
        snapshot,
      ),
    ],
    ["brand"],
  );
  assert.equal(
    review.registrationSnapshotMatches({ brand: "Nueva" }, snapshot, {
      ...snapshot,
      brand: "Cambio posterior",
    }),
    false,
  );
});
function hooks() {
  let cursor = 0;
  const slots = [];
  return {
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots))
          slots[i] = typeof initial === "function" ? initial() : initial;
        return [
          slots[i],
          (value) =>
            (slots[i] = typeof value === "function" ? value(slots[i]) : value),
        ];
      },
      useRef(initial) {
        const i = cursor++;
        return slots[i] ?? (slots[i] = { current: initial });
      },
    },
    reset() {
      cursor = 0;
    },
  };
}
const jsx = (type, props) => ({ type, props });
const nodes = (n, p) =>
  !n || typeof n !== "object"
    ? []
    : Array.isArray(n)
      ? n.flatMap((x) => nodes(x, p))
      : [...(p(n) ? [n] : []), ...nodes(n.props?.children, p)];
function vehicleHarness() {
  const h = hooks(),
    input = Object.fromEntries(
      [
        "plate",
        "brand",
        "model",
        "year",
        "vin",
        "engine",
        "mileage",
        "customerId",
        "version",
        "fuel",
        "transmission",
        "color",
      ].map((k) => [
        k,
        {
          value:
            k === "mileage" ? "85000" : k === "customerId" ? "owner-a" : "",
        },
      ]),
    ),
    form = { elements: { namedItem: (k) => input[k] } };
  const saved = [];
  let user = { id: "admin", workshopId: "workshop-a", role: "ADMIN" };
  const mod = compile(
    "features/vehiculos/components/forms/VehicleForm.tsx",
    (name) =>
      name === "react"
        ? h.react
        : name === "react/jsx-runtime"
          ? { jsx, jsxs: jsx }
          : name.endsWith("/registrationReview")
            ? review
            : name.endsWith("/PrivateRegistrationCapture")
              ? { PrivateRegistrationCapture: "Capture" }
              : name.endsWith("/PlateRegistrationCheck")
                ? { PlateRegistrationCheck: "PlateCheck" }
                : name.endsWith("/usePlateRegistrationCheck")
                  ? {
                      usePlateRegistrationCheck: () => ({
                        busy: false,
                        blocked: false,
                        check() {},
                      }),
                    }
                  : name.includes("StoreProvider")
                    ? {
                        useStore: () => ({
                          user,
                          data: { customers: [], vehicles: [] },
                          saveVehicle: async (value) => {
                            saved.push(value);
                            return value;
                          },
                        }),
                      }
                    : name.includes("primitives")
                      ? { Field: "Field", SelectField: "SelectField" }
                      : name.includes("/format")
                        ? { uid: () => "new-id" }
                        : { default: {} },
    {
      FormData: class {
        constructor(value) {
          this.form = value;
        }
        get(key) {
          return this.form.elements.namedItem(key)?.value ?? null;
        }
      },
    },
  );
  const render = () => {
    h.reset();
    const tree = mod.VehicleForm({
      ownerId: "owner-a",
      onSave() {},
      onCancel() {},
    });
    tree.props.ref.current = form;
    return tree;
  };
  const capture = () => nodes(render(), (n) => n.type === "Capture")[0]?.props;
  return {
    input,
    form,
    saved,
    render,
    capture,
    setUser(value) {
      user = value;
      render();
    },
  };
}
test("VehicleForm aplica solo allowlist sin guardar, conserva owner/km y mantiene FormData compatible", async () => {
  const h = vehicleHarness(),
    bridge = h.capture(),
    before = bridge.readForm();
  assert.equal(
    bridge.applyFields(
      {
        plate: "ABCD12",
        brand: "QA",
        model: "Uno",
        year: "2020",
        vin: "ZZZTEST0000000001",
      },
      before,
      false,
    ),
    "APPLIED",
  );
  assert.equal(h.saved.length, 0);
  assert.equal(h.input.mileage.value, "85000");
  assert.equal(h.input.customerId.value, "owner-a");
  await h
    .render()
    .props.onSubmit({ preventDefault() {}, currentTarget: h.form });
  assert.equal(h.saved.length, 1);
  assert.equal(h.saved[0].plate, "ABCD12");
  assert.equal(h.saved[0].customerId, "owner-a");
  assert.equal(h.saved[0].mileage, 85000);
});
test("VehicleForm exige confirmar sobrescritura y bloquea snapshot obsoleto sin aplicación parcial", () => {
  const h = vehicleHarness();
  h.input.brand.value = "Manual";
  const b = h.capture(),
    before = b.readForm();
  assert.equal(
    b.applyFields({ brand: "Nueva", model: "Otro" }, before, false),
    "OVERWRITE_REQUIRED",
  );
  assert.equal(h.input.model.value, "");
  h.input.brand.value = "Posterior";
  assert.equal(
    b.applyFields({ brand: "Nueva", model: "Otro" }, before, true),
    "STALE",
  );
  assert.equal(h.input.brand.value, "Posterior");
  assert.equal(h.input.model.value, "");
});
test("Callback de contexto anterior no puede aplicar tras cambiar sesión, taller o rol", () => {
  const h = vehicleHarness(),
    b = h.capture(),
    before = b.readForm();
  h.setUser({ id: "other", workshopId: "other", role: "WORKER" });
  assert.equal(b.applyFields({ plate: "ABCD12" }, before, true), "INVALID");
  assert.equal(h.input.plate.value, "");
  assert.equal(h.capture(), undefined);
});
function reviewHarness() {
  const h = hooks(),
    d = draft(),
    current = {
      plate: "Manual12",
      brand: "Manual",
      model: "",
      year: "",
      vin: "",
    },
    applied = [];
  const mod = compile(
    "features/vehiculos/components/forms/RegistrationRecognitionDraft.tsx",
    (name) =>
      name === "react"
        ? h.react
        : name === "react/jsx-runtime"
          ? { jsx, jsxs: jsx }
          : name.endsWith("/registrationReview")
            ? review
            : name.endsWith("/registrationExtraction")
              ? extraction
              : { default: {} },
  );
  const render = () => {
    h.reset();
    return mod.RegistrationRecognitionDraft({
      draft: d,
      readForm: () => ({ ...current }),
      applyFields(values, snapshot, overwrite) {
        applied.push({ values, snapshot, overwrite });
        if (!review.registrationSnapshotMatches(values, snapshot, current))
          return "STALE";
        Object.assign(current, values);
        return "APPLIED";
      },
    });
  };
  const find = (label) =>
    nodes(render(), (n) => n.props?.["aria-label"] === label)[0];
  const button = (label) =>
    nodes(
      render(),
      (n) =>
        n.type === "button" &&
        (Array.isArray(n.props.children)
          ? n.props.children.join("")
          : n.props.children) === label,
    )[0];
  return { d, current, applied, render, find, button };
}
test("UI: corregir invalida confirmación anterior, rechazar retira selección y botones no hacen submit", () => {
  const h = reviewHarness();
  h.find("Confirmar Marca").props.onChange({ target: { checked: true } });
  assert.equal(h.button("Aplicar campos seleccionados").props.disabled, false);
  h.find("Revisar Marca").props.onChange({ target: { value: "Corregida" } });
  assert.equal(h.button("Aplicar campos seleccionados").props.disabled, true);
  h.find("Confirmar Marca").props.onChange({ target: { checked: true } });
  h.button("Rechazar Marca").props.onClick();
  assert.equal(h.button("Aplicar campos seleccionados").props.disabled, true);
  assert.ok(
    nodes(h.render(), (n) => n.type === "button").every(
      (n) => n.props.type === "button",
    ),
  );
  assert.ok(
    nodes(h.render(), (n) => n.type === "input").every(
      (n) => n.props.name === undefined,
    ),
  );
});
test("UI: cancelar sobrescritura no aplica; confirmar aplica únicamente selección y la desmarca", () => {
  const h = reviewHarness();
  h.find("Confirmar Marca").props.onChange({ target: { checked: true } });
  h.button("Aplicar campos seleccionados").props.onClick();
  assert.equal(h.applied.length, 0);
  h.button("Cancelar aplicación").props.onClick();
  assert.equal(h.applied.length, 0);
  h.button("Aplicar campos seleccionados").props.onClick();
  h.button("Confirmar sobrescritura").props.onClick();
  assert.equal(h.applied.length, 1);
  assert.deepEqual({ ...h.applied[0].values }, { brand: "Marca QA" });
  assert.equal(h.current.plate, "Manual12");
  assert.equal(h.button("Aplicar campos seleccionados").props.disabled, true);
});
test("UI: escritura posterior al aviso de sobrescritura bloquea el resultado antiguo", () => {
  const h = reviewHarness();
  h.find("Confirmar Marca").props.onChange({ target: { checked: true } });
  h.button("Aplicar campos seleccionados").props.onClick();
  h.current.brand = "Dato posterior";
  h.button("Confirmar sobrescritura").props.onClick();
  assert.equal(h.current.brand, "Dato posterior");
  assert.ok(
    nodes(
      h.render(),
      (n) => n.props?.role === "status",
    )[0].props.children.includes("formulario cambió"),
  );
});

test("Editar OCR con Enter no envía el formulario ni bloquea botones explícitos", () => {
  const h = reviewHarness();
  let prevented = 0;
  const section = h.render();
  section.props.onKeyDown({
    key: "Enter",
    target: { tagName: "INPUT" },
    preventDefault() {
      prevented++;
    },
  });
  section.props.onKeyDown({
    key: "Enter",
    target: { tagName: "BUTTON" },
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(prevented, 1);
  assert.equal(h.applied.length, 0);
});

test("La aplicación solo lee campos propios; una patente heredada no se aplica", () => {
  const h = vehicleHarness(),
    b = h.capture(),
    values = Object.assign(Object.create({ plate: "EVIL12" }), {
      brand: "Confirmada",
    });
  assert.equal(b.applyFields(values, b.readForm(), false), "APPLIED");
  assert.equal(h.input.plate.value, "");
  assert.equal(h.input.brand.value, "Confirmada");
});
