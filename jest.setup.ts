import "@testing-library/jest-dom";

if (!global.structuredClone) {
  global.structuredClone = ((value: unknown) =>
    JSON.parse(JSON.stringify(value))) as typeof structuredClone;
}
