if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = require('@ungap/structured-clone').default;
}