import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  listScenes,
  getSceneById,
  createScene,
  updateScene,
  deleteScene,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Scene persistence ────────────────────────────────────────────────────
  scene: router({
    /** List all scenes for the current user */
    list: publicProcedure.query(async ({ ctx }) => {
      const ownerOpenId = ctx.user?.openId ?? null;
      return listScenes(ownerOpenId);
    }),

    /** Get a single scene by sceneId */
    get: publicProcedure
      .input(z.object({ sceneId: z.string() }))
      .query(async ({ input, ctx }) => {
        const scene = await getSceneById(input.sceneId);
        if (!scene) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        }
        // Only allow access if owner or public
        if (!scene.isPublic && scene.ownerOpenId && scene.ownerOpenId !== ctx.user?.openId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return scene;
      }),

    /** Save a new scene (creates a new record) */
    create: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          sceneData: z.any(),
          physicsSettings: z.any().optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const ownerOpenId = ctx.user?.openId ?? null;
        const scene = await createScene({
          name: input.name,
          ownerOpenId,
          sceneData: input.sceneData,
          physicsSettings: input.physicsSettings,
          isPublic: input.isPublic ?? false,
        });
        return scene;
      }),

    /** Update an existing scene */
    update: publicProcedure
      .input(
        z.object({
          sceneId: z.string(),
          name: z.string().min(1).max(255).optional(),
          sceneData: z.any().optional(),
          physicsSettings: z.any().optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await getSceneById(input.sceneId);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        }
        // Ownership check: only the owner can update
        if (existing.ownerOpenId && existing.ownerOpenId !== ctx.user?.openId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this scene" });
        }
        const ownerOpenId = ctx.user?.openId ?? null;
        const updated = await updateScene(input.sceneId, ownerOpenId, {
          name: input.name,
          sceneData: input.sceneData,
          physicsSettings: input.physicsSettings,
          isPublic: input.isPublic,
        });
        return updated;
      }),

    /** Delete a scene */
    delete: protectedProcedure
      .input(z.object({ sceneId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getSceneById(input.sceneId);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        }
        if (existing.ownerOpenId !== ctx.user.openId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this scene" });
        }
        await deleteScene(input.sceneId, ctx.user.openId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
