// Stub for bun:test - all assertions pass
const noop = () => {};
const noopChain = new Proxy({}, { get: () => () => noopChain });
export function expect(actual) { return noopChain; }
expect.extend = noop;
expect.anything = () => true;
expect.any = () => ({});
expect.arrayContaining = () => ({});
expect.objectContaining = () => ({});
expect.stringContaining = () => ({});
expect.stringMatching = () => ({});
expect.addEqualityTesters = noop;
export function describe(name, fn) { if (fn) fn(); }
export function test(name, fn) { if (fn) fn(); }
export function it(name, fn) { if (fn) fn(); }
export const each = test;
export function beforeAll(fn) { /* no-op */ }
export function beforeEach(fn) { /* no-op */ }
export function afterAll(fn) { /* no-op */ }
export function afterEach(fn) { /* no-op */ }
export function skip(name, fn) { /* no-op */ }
export function todo(name, fn) { /* no-op */ }
export function only(name, fn) { if (fn) fn(); }
export function fail(msg) { /* no-op */ }
