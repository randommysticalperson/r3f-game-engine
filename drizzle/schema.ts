import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Scenes table — stores each saved scene project.
 * The full scene graph (objects, components, settings) is stored as JSON
 * in the `sceneData` column so the schema stays flexible as the engine evolves.
 */
export const scenes = mysqlTable("scenes", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique short ID used in URLs and API calls */
  sceneId: varchar("sceneId", { length: 32 }).notNull().unique(),
  /** Human-readable scene name */
  name: varchar("name", { length: 255 }).notNull().default("Untitled Scene"),
  /** Owner's openId — null means it belongs to the anonymous/default session */
  ownerOpenId: varchar("ownerOpenId", { length: 64 }),
  /** Full serialized scene graph as JSON */
  sceneData: json("sceneData").notNull(),
  /** Physics settings snapshot */
  physicsSettings: json("physicsSettings"),
  /** Whether this scene is publicly accessible */
  isPublic: boolean("isPublic").default(false).notNull(),
  /** Thumbnail URL (optional, for scene browser) */
  thumbnailUrl: text("thumbnailUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;
