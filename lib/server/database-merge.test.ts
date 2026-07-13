import { describe, expect, it } from "vitest";
import { mergeVelvetDatabases } from "./database-merge";
import type { VelvetDatabase } from "./types";

const empty: VelvetDatabase = {
  setup: {},
  projects: [],
  prompts: [],
  jobs: [],
  uploads: [],
  usage: []
};

describe("hosted database merge", () => {
  it("keeps the newest project copy and preserves records from both sides", () => {
    const merged = mergeVelvetDatabases(
      {
        ...empty,
        setup: { updatedAt: "local-setup" },
        projects: [
          {
            id: "same",
            title: "Local newer",
            brief: "brief",
            status: "approved",
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T02:00:00.000Z"
          }
        ],
        prompts: [
          {
            id: "local-prompt",
            projectId: "same",
            kind: "brief",
            prompt: "local",
            version: 1,
            createdAt: "2026-07-13T02:00:00.000Z"
          }
        ]
      },
      {
        ...empty,
        projects: [
          {
            id: "same",
            title: "Hosted older",
            brief: "brief",
            status: "blueprint",
            createdAt: "2026-07-13T00:00:00.000Z",
            updatedAt: "2026-07-13T01:00:00.000Z"
          },
          {
            id: "hosted-only",
            title: "Hosted only",
            brief: "brief",
            status: "blueprint",
            createdAt: "2026-07-13T03:00:00.000Z",
            updatedAt: "2026-07-13T03:00:00.000Z"
          }
        ]
      }
    );

    expect(merged.setup.updatedAt).toBe("local-setup");
    expect(merged.projects.map((project) => project.id)).toEqual(["hosted-only", "same"]);
    expect(merged.projects.find((project) => project.id === "same")?.title).toBe("Local newer");
    expect(merged.prompts).toHaveLength(1);
  });
});
