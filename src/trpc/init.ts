import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import superjson from "superjson"
export const createTRPCContext = cache(async () => {

    const { userId } = await auth();
    /**
     * @see: https://trpc.io/docs/server/context
     */
    return { userId: 'user_123' };
});

const t = initTRPC.create({
    /**
     * @see https://trpc.io/docs/server/data-transformers
     */
    transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// 3:36