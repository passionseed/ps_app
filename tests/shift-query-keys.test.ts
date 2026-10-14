import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";

describe("SHIFT query isolation", () => {
  it("separates cohort data by account and cohort", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.shift.snapshot("user-a", "camp-a"), "snapshot-a");
    client.setQueryData(queryKeys.shift.snapshot("user-b", "camp-a"), "snapshot-b");
    client.setQueryData(queryKeys.shift.snapshot("user-a", "camp-b"), "snapshot-c");

    expect(client.getQueryData(queryKeys.shift.snapshot("user-a", "camp-a"))).toBe("snapshot-a");
    expect(client.getQueryData(queryKeys.shift.snapshot("user-b", "camp-a"))).toBe("snapshot-b");
    expect(client.getQueryData(queryKeys.shift.snapshot("user-a", "camp-b"))).toBe("snapshot-c");
    client.clear();
  });

  it("removes only the signed-out account's camp data and signed image URLs", () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.shift.cohorts("user-a"), ["camp-a"]);
    client.setQueryData(queryKeys.shift.image("user-a", "screenshot"), "private-url");
    client.setQueryData(queryKeys.shift.cohorts("user-b"), ["camp-b"]);
    client.removeQueries({ queryKey: queryKeys.shift.user("user-a") });

    expect(client.getQueryData(queryKeys.shift.cohorts("user-a"))).toBeUndefined();
    expect(client.getQueryData(queryKeys.shift.image("user-a", "screenshot"))).toBeUndefined();
    expect(client.getQueryData(queryKeys.shift.cohorts("user-b"))).toEqual(["camp-b"]);
    client.clear();
  });
});
