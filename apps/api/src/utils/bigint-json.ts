// src/utils/bigint-json.ts

declare global {
    interface BigInt { toJSON(): string }
}
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};
export {};
