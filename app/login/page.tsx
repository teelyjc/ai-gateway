import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-accent" />
          <span className="text-base font-semibold tracking-tight">AI Portal</span>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Sign in with your organization account to manage virtual keys and view usage.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("authentik", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Authentik
          </Button>
        </form>
      </Card>
    </div>
  );
}
