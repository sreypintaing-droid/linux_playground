import { z } from "zod";
import { hashPassword } from "@/server/auth/password";
import { homeFor, setSessionCookie } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { body, conflict, forbidden, publicRoute } from "@/server/http";
import { getSettings } from "@/server/services/settings";
import { provisionUser } from "@/server/services/users";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
});

export const POST = publicRoute(
  { rateLimit: { bucket: "auth-register", limit: 10 } },
  async ({ req, ip }) => {
    const settings = await getSettings();
    if (!settings.registrationOpen)
      throw forbidden(
        "Registration is currently closed. Ask your teacher or administrator for an account.",
      );
    const input = await body(req, schema);
    const exists = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (exists) throw conflict("An account with this email already exists.");
    const { user } = await provisionUser({
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
    });
    await setSessionCookie({
      sub: user.id,
      sv: user.sessionVersion,
      role: user.role,
    });
    await audit(user.id, "auth.register", undefined, { provider: "local" }, ip);
    return { redirect: homeFor(user.role) };
  },
);
