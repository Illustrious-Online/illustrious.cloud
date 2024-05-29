import { afterEach } from "bun:test";
import { MockResult } from "./src/utils/mock";

export let mocks: MockResult[] = [];

afterEach(() => {
  mocks.forEach((mockResult) => mockResult.clear());
  mocks = [];
});