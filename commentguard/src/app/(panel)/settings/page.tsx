import { Plug, LogOut } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, inputClass, Label } from "@/components/ui/input";
import { logoutAction } from "@/app/login/actions";
import { getAccount } from "@/lib/account";
import { env } from "@/lib/env";
import { formatDate, formatDateTime } from "@/lib/format";
import { metaLoginConfigured } from "@/lib/meta-login";
import { getAllSettings, type SettingKey } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { connectAction, saveScanSettingsAction } from "../actions";

export const maxDuration = 30;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [account, s] = await Promise.all([getAccount(), getAllSettings()]);
  const canMetaLogin = metaLoginConfigured();
  const missingComments = account?.tokenScopes && !account.tokenScopes.includes("instagram_manage_comments");
  const daysLeft = account?.tokenExpiresAt ? Math.floor((account.tokenExpiresAt.getTime() - Date.now()) / 86_400_000) : null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-400">More settings (mode, delays, caps, AI, Telegram) arrive in the next steps.</p>
      </header>

      {sp.connected ? (
        <p role="status" className="rounded-xl bg-brand-500/10 px-3 py-2 text-sm text-brand-400">
          Connected @{sp.connected}. Tap “Scan now” on Home to start reading comments.
        </p>
      ) : null}
      {sp.connect_error ? (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Couldn&apos;t connect: {sp.connect_error}
        </p>
      ) : null}

      <Card className="space-y-3">
        <CardTitle>Instagram account</CardTitle>
        {account ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-zinc-400">Account</dt>
            <dd className="font-semibold">
              @{account.username} {account.accountType ? <Badge className="ml-1">{account.accountType.replace("MEDIA_", "").toLowerCase()}</Badge> : null}
            </dd>
            <dt className="text-zinc-400">Connected</dt>
            <dd>{formatDateTime(account.connectedAt)}</dd>
            <dt className="text-zinc-400">Login type</dt>
            <dd>{account.apiFlavor === "facebook" ? "Unified login (system-user token)" : "Instagram Login"}</dd>
            <dt className="text-zinc-400">Token expires</dt>
            <dd className={cn(daysLeft !== null && daysLeft <= 7 && "text-amber-300")}>
              {account.tokenExpiresAt ? (
                <>
                  {formatDate(account.tokenExpiresAt)} ({daysLeft} days)
                </>
              ) : account.apiFlavor === "facebook" && !account.tokenExpiryEstimated ? (
                "Never"
              ) : (
                "Unknown (set META_APP_ID and META_APP_SECRET to check)"
              )}
              {account.apiFlavor === "instagram" && account.tokenExpiryEstimated ? (
                <span className="block text-xs text-zinc-500">estimated until the first refresh (after 24h)</span>
              ) : null}
            </dd>
            {account.apiFlavor === "instagram" ? (
              <>
                <dt className="text-zinc-400">Last refresh</dt>
                <dd>{account.tokenRefreshedAt ? formatDateTime(account.tokenRefreshedAt) : "not yet"}</dd>
              </>
            ) : null}
            {account.tokenScopes ? (
              <>
                <dt className="text-zinc-400">Permissions</dt>
                <dd className="flex flex-wrap gap-1">
                  {account.tokenScopes.map((sc) => (
                    <Badge key={sc}>{sc}</Badge>
                  ))}
                </dd>
              </>
            ) : null}
            {account.lastError ? (
              <>
                <dt className="text-red-300">Problem</dt>
                <dd className="text-red-300">{account.lastError}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-zinc-300">Not connected yet.</p>
        )}
        {missingComments ? (
          <p className="text-sm text-red-300">The token is missing instagram_manage_comments. Add it to the login configuration and connect again.</p>
        ) : null}
        {env.igMock ? <Badge tone="warn">Mock mode: fake Instagram data (IG_MOCK=true).</Badge> : null}

        {canMetaLogin ? (
          <a href="/api/auth/meta/start" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            <Plug aria-hidden /> {account ? "Reconnect with Meta" : "Connect with Meta"}
          </a>
        ) : (
          <p className="text-xs text-zinc-500">
            To get a “Connect with Meta” button, set META_APP_ID, META_APP_SECRET and META_CONFIG_ID (README → Meta setup).
          </p>
        )}

        <ActionForm action={connectAction} className="border-t border-zinc-800 pt-3">
          <div>
            <Label htmlFor="token">{canMetaLogin ? "Or paste an access token" : account ? "Reconnect: paste a new access token" : "Paste your access token"}</Label>
            <textarea
              id="token"
              name="token"
              required
              rows={3}
              autoComplete="off"
              spellCheck={false}
              className={cn(inputClass, "py-2 font-mono text-xs")}
              placeholder="EAA…"
            />
            <p className="mt-1 text-xs text-zinc-500">
              A system-user token (starts with EAA…) or an Instagram Login token (IGAA…).{env.igMock ? " In mock mode use “EAAmock-token” or “mock-token”." : ""} It is stored encrypted; you never need your Instagram password here.
            </p>
          </div>
          <SubmitButton variant={canMetaLogin ? "secondary" : "default"} className="w-full" pendingText="Checking with Instagram…">
            <Plug aria-hidden /> {account ? "Reconnect with token" : "Connect with token"}
          </SubmitButton>
        </ActionForm>
      </Card>

      <Card>
        <CardTitle className="mb-3">Scanning</CardTitle>
        <ActionForm action={saveScanSettingsAction}>
          <div className="grid grid-cols-2 gap-3">
            <NumberField name="scan.hotPosts" label="Newest posts" value={s["scan.hotPosts"]} />
            <NumberField name="scan.hotIntervalMin" label="…scanned every (min)" value={s["scan.hotIntervalMin"]} />
            <NumberField name="scan.recentPosts" label="Recent posts" value={s["scan.recentPosts"]} />
            <NumberField name="scan.recentIntervalMin" label="…scanned every (min)" value={s["scan.recentIntervalMin"]} />
            <NumberField name="scan.olderIntervalMin" label="Older posts every (min)" value={s["scan.olderIntervalMin"]} />
            <NumberField name="scan.mediaSyncIntervalMin" label="Look for new posts (min)" value={s["scan.mediaSyncIntervalMin"]} />
          </div>
          <div>
            <Label htmlFor="scan.monitor">Posts to monitor</Label>
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <select id="scan.monitor" name="scan.monitor" defaultValue={s["scan.monitor"]} className={inputClass}>
                <option value="all">All posts</option>
                <option value="recent">Only the most recent N</option>
              </select>
              <Input name="scan.monitorRecentN" type="number" inputMode="numeric" defaultValue={s["scan.monitorRecentN"]} aria-label="N" />
            </div>
          </div>
          <SubmitButton variant="secondary" className="w-full">
            Save scanning settings
          </SubmitButton>
        </ActionForm>
      </Card>

      <form action={logoutAction}>
        <Button variant="outline" className="w-full" type="submit">
          <LogOut aria-hidden /> Log out
        </Button>
      </form>
    </div>
  );
}

function NumberField({ name, label, value }: { name: SettingKey; label: string; value: number }) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input id={name} name={name} type="number" inputMode="numeric" min={0} defaultValue={value} />
    </div>
  );
}
