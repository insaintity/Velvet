import type { JobRecord, ProjectRecord, VelvetDatabase } from "./types";

export function mergeVelvetDatabases(localDatabase: VelvetDatabase, hostedDatabase: VelvetDatabase): VelvetDatabase {
  return {
    setup: localDatabase.setup,
    projects: sortByUpdatedAtDesc(mergeByNewest(localDatabase.projects, hostedDatabase.projects, "updatedAt")),
    prompts: sortByCreatedAtDesc(mergeByCreated(localDatabase.prompts, hostedDatabase.prompts)),
    jobs: sortByUpdatedAtDesc(mergeByNewest(localDatabase.jobs, hostedDatabase.jobs, "updatedAt")),
    uploads: sortByCreatedAtDesc(mergeByCreated(localDatabase.uploads, hostedDatabase.uploads)),
    usage: sortByCreatedAtDesc(mergeByCreated(localDatabase.usage, hostedDatabase.usage))
  };
}

function mergeByCreated<T extends { id: string; createdAt: string }>(localRecords: T[], hostedRecords: T[]) {
  return mergeByNewest(localRecords, hostedRecords, "createdAt");
}

function mergeByNewest<T extends { id: string }>(localRecords: T[], hostedRecords: T[], dateKey: keyof T) {
  const records = new Map<string, T>();

  for (const record of [...hostedRecords, ...localRecords]) {
    const existing = records.get(record.id);
    if (!existing || readTime(record[dateKey]) >= readTime(existing[dateKey])) {
      records.set(record.id, record);
    }
  }

  return [...records.values()];
}

function sortByUpdatedAtDesc<T extends ProjectRecord | JobRecord>(records: T[]) {
  return [...records].sort((left, right) => readTime(right.updatedAt) - readTime(left.updatedAt));
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(records: T[]) {
  return [...records].sort((left, right) => readTime(right.createdAt) - readTime(left.createdAt));
}

function readTime(value: unknown) {
  return typeof value === "string" ? new Date(value).getTime() || 0 : 0;
}
