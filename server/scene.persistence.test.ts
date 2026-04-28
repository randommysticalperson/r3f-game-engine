/**
 * Tests for scene persistence tRPC routes.
 * Uses in-memory mocks so no real DB connection is required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// --- Mock the db module ---
vi.mock("./db", () => ({
  listScenes: vi.fn().mockResolvedValue([]),
  getSceneById: vi.fn().mockResolvedValue(null),
  createScene: vi.fn().mockResolvedValue({
    id: 1,
    sceneId: "test-scene-id",
    name: "Test Scene",
    ownerOpenId: "user-open-id",
    sceneData: {},
    physicsSettings: null,
    isPublic: false,
    thumbnailUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateScene: vi.fn().mockResolvedValue(null),
  deleteScene: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

// --- Context helpers ---
function makeCtx(openId?: string): TrpcContext {
  const user = openId
    ? {
        id: 1,
        openId,
        name: "Test User",
        email: "test@example.com",
        loginMethod: "manus",
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("scene.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty list when no scenes exist", async () => {
    vi.mocked(db.listScenes).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx("user-open-id"));
    const result = await caller.scene.list();
    expect(result).toEqual([]);
    expect(db.listScenes).toHaveBeenCalledWith("user-open-id");
  });

  it("passes null ownerOpenId for anonymous users", async () => {
    vi.mocked(db.listScenes).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx());
    await caller.scene.list();
    expect(db.listScenes).toHaveBeenCalledWith(null);
  });
});

describe("scene.get", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when scene does not exist", async () => {
    vi.mocked(db.getSceneById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx("user-open-id"));
    await expect(caller.scene.get({ sceneId: "nonexistent" })).rejects.toThrow("Scene not found");
  });

  it("returns a public scene to anonymous users", async () => {
    vi.mocked(db.getSceneById).mockResolvedValueOnce({
      id: 1,
      sceneId: "public-scene",
      name: "Public Scene",
      ownerOpenId: "other-user",
      sceneData: { objects: {} },
      physicsSettings: null,
      isPublic: true,
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.scene.get({ sceneId: "public-scene" });
    expect(result.name).toBe("Public Scene");
  });

  it("throws FORBIDDEN when accessing private scene of another user", async () => {
    vi.mocked(db.getSceneById).mockResolvedValueOnce({
      id: 2,
      sceneId: "private-scene",
      name: "Private Scene",
      ownerOpenId: "other-user",
      sceneData: {},
      physicsSettings: null,
      isPublic: false,
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx("my-user"));
    await expect(caller.scene.get({ sceneId: "private-scene" })).rejects.toThrow("Access denied");
  });
});

describe("scene.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new scene with the correct owner", async () => {
    const caller = appRouter.createCaller(makeCtx("user-open-id"));
    const result = await caller.scene.create({
      name: "My Scene",
      sceneData: { objects: {}, rootIds: [] },
      isPublic: false,
    });
    expect(db.createScene).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My Scene",
        ownerOpenId: "user-open-id",
        isPublic: false,
      })
    );
    expect(result?.sceneId).toBe("test-scene-id");
  });

  it("creates a scene for anonymous user with null ownerOpenId", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.scene.create({
      name: "Anon Scene",
      sceneData: {},
    });
    expect(db.createScene).toHaveBeenCalledWith(
      expect.objectContaining({ ownerOpenId: null })
    );
  });
});

describe("scene.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NOT_FOUND when scene does not exist", async () => {
    vi.mocked(db.getSceneById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx("user-open-id"));
    await expect(caller.scene.delete({ sceneId: "nonexistent" })).rejects.toThrow("Scene not found");
  });

  it("throws FORBIDDEN when deleting another user's scene", async () => {
    vi.mocked(db.getSceneById).mockResolvedValueOnce({
      id: 3,
      sceneId: "other-scene",
      name: "Other Scene",
      ownerOpenId: "other-user",
      sceneData: {},
      physicsSettings: null,
      isPublic: false,
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx("my-user"));
    await expect(caller.scene.delete({ sceneId: "other-scene" })).rejects.toThrow("You do not own this scene");
  });

  it("deletes own scene successfully", async () => {
    vi.mocked(db.getSceneById).mockResolvedValueOnce({
      id: 4,
      sceneId: "my-scene",
      name: "My Scene",
      ownerOpenId: "my-user",
      sceneData: {},
      physicsSettings: null,
      isPublic: false,
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx("my-user"));
    const result = await caller.scene.delete({ sceneId: "my-scene" });
    expect(result).toEqual({ success: true });
    expect(db.deleteScene).toHaveBeenCalledWith("my-scene", "my-user");
  });
});
