import { mkdir } from "node:fs/promises";
import path from "node:path";

export const velvetDir = process.env.VELVET_DATA_DIR?.trim()
  ? path.resolve(process.env.VELVET_DATA_DIR.trim())
  : path.join(process.cwd(), ".velvet");
export const databasePath = path.join(velvetDir, "db.json");
export const secretsPath = path.join(velvetDir, "secrets.json");
export const masterKeyPath = path.join(velvetDir, "master.key");
export const exportsDir = path.join(velvetDir, "exports");

export async function ensureVelvetDir() {
  await mkdir(velvetDir, { recursive: true });
  await mkdir(exportsDir, { recursive: true });
}
