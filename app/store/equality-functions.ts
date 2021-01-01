export function isEqualByStringify(oldValue: any|undefined, newValue: any|undefined): boolean {
  if (oldValue === newValue) {
    return true;
  }
  if (oldValue === undefined || newValue === undefined) {
    return false;
  }
  return JSON.stringify(oldValue) === JSON.stringify(newValue);
}

/** Returns true if arrays are equal. */
export function isEqualByShallowArrayCompare(a1?: readonly any[], a2?: readonly any[]): boolean {
  if (a1 === a2) {
    return true;
  }
  if (a1 === undefined || a2 === undefined) {
    return false;
  }
  if (a1.length !== a2.length) {
    return false;
  }
  for (let i = 0, n = a1.length; i < n; i++) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }
  return true;
}
