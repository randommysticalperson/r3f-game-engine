import { eq, desc, and, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertScene, users, scenes } from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from "nanoid";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Scene persistence helpers ────────────────────────────────────────────────

/** List all scenes owned by a user (or public scenes if ownerOpenId is null) */
export async function listScenes(ownerOpenId: string | null) {
  const db = await getDb();
  if (!db) return [];

  if (ownerOpenId) {
    return db
      .select()
      .from(scenes)
      .where(eq(scenes.ownerOpenId, ownerOpenId))
      .orderBy(desc(scenes.updatedAt));
  }
  // For anonymous users, return public scenes only
  return db
    .select()
    .from(scenes)
    .where(and(eq(scenes.isPublic, true), isNull(scenes.ownerOpenId)))
    .orderBy(desc(scenes.updatedAt));
}

/** Get a single scene by its sceneId */
export async function getSceneById(sceneId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(scenes)
    .where(eq(scenes.sceneId, sceneId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/** Create a new scene and return it */
export async function createScene(data: {
  name: string;
  ownerOpenId: string | null;
  sceneData: unknown;
  physicsSettings?: unknown;
  isPublic?: boolean;
  thumbnailUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sceneId = nanoid(12);

  await db.insert(scenes).values({
    sceneId,
    name: data.name,
    ownerOpenId: data.ownerOpenId ?? null,
    sceneData: data.sceneData as any,
    physicsSettings: (data.physicsSettings ?? null) as any,
    isPublic: data.isPublic ?? false,
    thumbnailUrl: data.thumbnailUrl ?? null,
  });

  return getSceneById(sceneId);
}

/** Update an existing scene's data */
export async function updateScene(
  sceneId: string,
  ownerOpenId: string | null,
  data: {
    name?: string;
    sceneData?: unknown;
    physicsSettings?: unknown;
    isPublic?: boolean;
    thumbnailUrl?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.sceneData !== undefined) updateSet.sceneData = data.sceneData;
  if (data.physicsSettings !== undefined) updateSet.physicsSettings = data.physicsSettings;
  if (data.isPublic !== undefined) updateSet.isPublic = data.isPublic;
  if (data.thumbnailUrl !== undefined) updateSet.thumbnailUrl = data.thumbnailUrl;

  const whereClause = ownerOpenId
    ? and(eq(scenes.sceneId, sceneId), eq(scenes.ownerOpenId, ownerOpenId))
    : eq(scenes.sceneId, sceneId);

  await db.update(scenes).set(updateSet).where(whereClause);

  return getSceneById(sceneId);
}

/** Delete a scene by sceneId (only the owner can delete) */
export async function deleteScene(sceneId: string, ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(scenes)
    .where(and(eq(scenes.sceneId, sceneId), eq(scenes.ownerOpenId, ownerOpenId)));
}
