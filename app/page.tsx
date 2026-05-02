"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  ShieldCheck,
  Clock,
  PlayCircle,
  Copy,
  CheckCircle2,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { isDevMode } from "@/lib/dev";

type Status = {
  sessionId: string;
  adCompleted: boolean;
  key: { value: string; expiresAt: string } | null;
};

const SESSION_KEY = "script-key:session";

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(0);

  async function refresh(sessionId?: string) {
    const stored = localStorage.getItem(SESSION_KEY);
    const cleanStored =
      stored && stored !== "undefined" && stored !== "null" ? stored : "";
    const id =
      sessionId && sessionId !== "undefined" ? sessionId : cleanStored;
    const res = await fetch(`/api/session${id ? `?id=${id}` : ""}`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok || !data?.sessionId) {
      localStorage.removeItem(SESSION_KEY);
      toast.error(data?.error ?? "Failed to start session — check DB schema");
      setLoading(false);
      return;
    }
    localStorage.setItem(SESSION_KEY, data.sessionId);
    setStatus(data as Status);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!status?.key) return;
    const tick = () => {
      const ms = new Date(status.key!.expiresAt).getTime() - Date.now();
      setRemaining(ms);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [status?.key]);

  useEffect(() => {
    if (!status || status.adCompleted) return;
    const onFocus = () => refresh(status.sessionId);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ad = params.get("ad");
    if (!ad) return;
    if (ad === "ok") {
      toast.success("Ad completed — you can generate your key now");
    } else if (ad === "invalid") {
      toast.error("Link is invalid or expired. Please try again.");
    } else if (ad === "notfound") {
      toast.error("Session not found — please refresh the page");
    }
    window.history.replaceState({}, "", "/");
  }, []);

  async function handleWatchAd() {
    if (!status) return;
    const res = await fetch("/api/ad/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: status.sessionId }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      toast.error(data.error ?? "Failed to open ad page");
      return;
    }
    window.location.href = data.url;
  }

  async function handleDevSkip() {
    if (!status) return;
    const res = await fetch("/api/ad/dev-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: status.sessionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Skip failed");
      return;
    }
    toast.success("Skipped ad (dev mode)");
    await refresh(status.sessionId);
  }

  async function handleGenerate() {
    if (!status) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/key/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: status.sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate key");
        return;
      }
      toast.success("Key generated successfully!");
      await refresh(status.sessionId);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!status?.key) return;
    await navigator.clipboard.writeText(status.key.value);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  const step = !status?.adCompleted ? 1 : !status.key ? 2 : 3;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl border border-border/60 bg-card/50 p-3 shadow-sm">
          <KeyRound className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Script Key System
        </h1>
        <p className="mt-2 text-muted-foreground">
          Watch one ad to receive a key valid for 24 hours
        </p>
      </header>

      <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <StepDot label="1. Watch Ad" active={step >= 1} done={step > 1} />
        <div className="h-px w-8 bg-border" />
        <StepDot label="2. Generate Key" active={step >= 2} done={step > 2} />
        <div className="h-px w-8 bg-border" />
        <StepDot label="3. Use Key" active={step >= 3} done={false} />
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Your Status
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh(status?.sessionId)}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </div>
          {isDevMode() && (
            <CardDescription>
              Session ID:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {status?.sessionId ?? "…"}
              </code>
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Step 1 — Watch Ad</p>
                  <p className="text-sm text-muted-foreground">
                    Click the button to open the ad in a new tab
                  </p>
                </div>
              </div>
              {status?.adCompleted ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </div>
            {!status?.adCompleted && (
              <div className="mt-4 space-y-2">
                <Button
                  className="w-full"
                  onClick={handleWatchAd}
                  disabled={loading || !status}
                >
                  <ExternalLink /> Watch Ad
                </Button>
                {isDevMode() && (
                  <Button
                    className="w-full border-dashed"
                    variant="outline"
                    size="sm"
                    onClick={handleDevSkip}
                    disabled={loading || !status}
                  >
                    🛠 Dev: Skip Ad
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border/60 bg-card/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Step 2 — Generate Key</p>
                  <p className="text-sm text-muted-foreground">
                    Key is valid for 24 hours from generation time
                  </p>
                </div>
              </div>
              {status?.key ? (
                <Badge variant="success">
                  <Clock className="h-3 w-3" />
                  {formatDuration(remaining)}
                </Badge>
              ) : (
                <Badge variant="secondary">Not yet</Badge>
              )}
            </div>

            {status?.key ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-border/80 bg-background px-3 py-2 font-mono text-sm">
                  <span className="truncate">{status.key.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={handleCopy}
                  >
                    {copied ? <CheckCircle2 /> : <Copy />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(status.key.expiresAt).toLocaleString("en-US")}
                </p>
              </div>
            ) : (
              <Button
                className="mt-4 w-full"
                onClick={handleGenerate}
                disabled={!status?.adCompleted || generating}
              >
                {generating ? <Loader2 className="animate-spin" /> : <KeyRound />}
                {generating ? "Generating..." : "Generate Key"}
              </Button>
            )}
          </section>
        </CardContent>
      </Card>
    </main>
  );
}

function StepDot({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 " +
        (active ? "text-foreground" : "text-muted-foreground")
      }
    >
      <span
        className={
          "inline-block h-2 w-2 rounded-full " +
          (done
            ? "bg-emerald-500"
            : active
              ? "bg-primary"
              : "bg-muted-foreground/40")
        }
      />
      {label}
    </span>
  );
}
