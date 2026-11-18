// import { z } from "zod";
// import { canAccess, normalizePath } from "@/lib/linux-engine";
// import { FsError, LIMITS } from "@/lib/linux-engine/filesystem";
// import { identityFor } from "@/lib/linux-engine/users";
// import { withEnvironment } from "@/server/environments/store";
// import { badRequest, body, forbidden, route } from "@/server/http";
// import { targetFromQuery, targetSchema } from "@/server/schemas";
// import { resolveEnvId } from "@/server/services/terminal";

// /**
//  * Text editor backend for `nano` / `vim`. A file can only be opened or saved
//  * when the shell granted access to it (the editor command checked the
//  * permissions of the user who ran it); the save re-checks them as that user.
//  */
// export const GET = route({}, async ({ req, user }) => {
//   const path = req.nextUrl.searchParams.get("path");
//   if (!path) throw badRequest("path is required");
//   const { envId } = await resolveEnvId(user, targetFromQuery(req.nextUrl.searchParams));
//   return withEnvironment(
//     envId,
//     (env) => {
//       const abs = normalizePath(path, "/");
//       const grant = env.state.session.editGrants?.find((g) => g.path === abs && g.expires > Date.now());
//       if (!grant) throw forbidden("Open the file with nano or vim in the terminal first.");
//       const who = identityFor(env.state, grant.user);
//       const node = env.fs.tryLookup(abs, "/", who);
//       if (node && node.type !== "file") throw badRequest("Not a regular file.");
//       if (node && !canAccess(node, who, 4)) throw forbidden("Permission denied");
//       return { path: abs, content: node?.content ?? "", exists: !!node, readOnly: grant.readOnly, user: grant.user };
//     },
//     { persist: false },
//   );
// });

// const saveSchema = z.object({ target: targetSchema, path: z.string().min(1).max(4096), content: z.string().max(LIMITS.maxFileSize) });

// export const PUT = route({ rateLimit: { bucket: "files", limit: 60 } }, async ({ req, user }) => {
//   const input = await body(req, saveSchema);
//   const { envId } = await resolveEnvId(user, input.target);
//   return withEnvironment(envId, (env) => {
//     const abs = normalizePath(input.path, "/");
//     const grant = env.state.session.editGrants?.find((g) => g.path === abs && g.expires > Date.now());
//     if (!grant) throw forbidden("Open the file with nano or vim in the terminal first.");
//     const who = identityFor(env.state, grant.user);
//     const now = Date.now();
//     try {
//       const existing = env.fs.tryLookup(abs, "/", who);
//       if (existing) {
//         if (existing.type !== "file") throw badRequest("Not a regular file.");
//         if (!canAccess(existing, who, 2)) throw forbidden(`[ Error writing ${abs}: Permission denied ]`);
//         env.fs.writeContent(existing, input.content, false, now);
//       } else {
//         const { parent, name } = env.fs.lookupParent(abs, "/", who);
//         if (!canAccess(parent, who, 3)) throw forbidden(`[ Error writing ${abs}: Permission denied ]`);
//         const umask = env.state.session.umask;
//         env.fs.create(parent, name, "file", { uid: who.uid, gid: parent.mode & 0o2000 ? parent.gid : who.gid, mode: 0o666 & ~umask, content: input.content, now });
//       }
//     } catch (e) {
//       if (e instanceof FsError) throw badRequest(`[ Error writing ${abs}: ${e.message} ]`);
//       throw e;
//     }
//     const lines = input.content === "" ? 0 : input.content.split("\n").length - (input.content.endsWith("\n") ? 1 : 0);
//     return { saved: true, lines };
//   });
// });


import { NextResponse } from 'next/server';
// @ts-ignore
import { db } from '../../../lib/db';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json(
      { 
        message: 'Login successful', 
        user: { id: user.id, name: user.name, email: user.email } 
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}