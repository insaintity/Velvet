import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { databasePath, ensureVelvetDir } from "./paths";
import type { JobRecord, ProjectRecord, PromptRecord, SetupRecord, UsageRecord, VelvetDatabase } from "./types";

const emptyDatabase: VelvetDatabase = {
  setup: {},
  projects: [],
  prompts: [],
  jobs: [],
  uploads: [],
  usage: []
};

export async function readDatabase(): Promise<VelvetDatabase> {
  await ensureVelvetDir();

  try {
    const raw = await readFile(databasePath, "utf8");
    return { ...emptyDatabase, ...JSON.parse(raw) };
  } catch {
    await writeDatabase(emptyDatabase);
    return emptyDatabase;
  }
}

export async function writeDatabase(database: VelvetDatabase) {
  await ensureVelvetDir();
  await writeFile(databasePath, `${JSON.stringify(database, null, 2)}\n`);
}

export async function updateSetup(setup: SetupRecord) {
  const database = await readDatabase();
  database.setup = { ...database.setup, ...setup, updatedAt: new Date().toISOString() };
  await writeDatabase(database);
  return database.setup;
}

export async function addPrompt(prompt: Omit<PromptRecord, "id" | "createdAt" | "version">) {
  const database = await readDatabase();
  const version = database.prompts.filter((item) => item.projectId === prompt.projectId && item.kind === prompt.kind).length + 1;
  const record: PromptRecord = {
    id: randomUUID(),
    version,
    createdAt: new Date().toISOString(),
    ...prompt
  };
  database.prompts.unshift(record);
  await writeDatabase(database);
  return record;
}

export async function addJob(job: Omit<JobRecord, "id" | "createdAt" | "updatedAt">) {
  const database = await readDatabase();
  const now = new Date().toISOString();
  const record: JobRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...job
  };
  database.jobs.unshift(record);
  await writeDatabase(database);
  return record;
}

export async function updateJob(id: string, patch: Partial<JobRecord>) {
  const database = await readDatabase();
  database.jobs = database.jobs.map((job) => (job.id === id ? { ...job, ...patch, updatedAt: new Date().toISOString() } : job));
  await writeDatabase(database);
  return database.jobs.find((job) => job.id === id);
}

export async function getProject(id: string) {
  const database = await readDatabase();
  return database.projects.find((project) => project.id === id);
}

export async function updateProject(id: string, patch: Partial<ProjectRecord>) {
  const database = await readDatabase();
  database.projects = database.projects.map((project) =>
    project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project
  );
  await writeDatabase(database);
  return database.projects.find((project) => project.id === id);
}

export async function addUsage(usage: Omit<UsageRecord, "id" | "createdAt">) {
  const database = await readDatabase();
  const record: UsageRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...usage
  };
  database.usage.unshift(record);
  await writeDatabase(database);
  return record;
}
