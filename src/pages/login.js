import Head from "next/head";
import { useRouter } from "next/router";

import Login from "@/components/Login";
import SiteShell from "@/components/SiteShell";

export default function LoginPage() {
  const router = useRouter();
  const next = typeof router.query.next === "string" ? router.query.next : "/";

  return (
    <SiteShell>
      <Head>
        <title>Login | Songle</title>
      </Head>

      <section className="grid min-h-[calc(100vh-145px)] place-items-center px-6 py-10 sm:px-10">
        <Login next={next.startsWith("/") && !next.startsWith("//") ? next : "/"} />
      </section>
    </SiteShell>
  );
}
