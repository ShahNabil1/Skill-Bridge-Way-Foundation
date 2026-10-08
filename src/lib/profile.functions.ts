import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { profileInfoSchema } from "./profile-schema";

export const saveProfileInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInfoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      full_name: `${data.first_name} ${data.last_name}`,
      phone: data.phone,
      address: JSON.stringify(data.address),
    }).select("*").single();
    if (error) throw new Error("Couldn't save your profile. Please try again.");
    return profile;
  });