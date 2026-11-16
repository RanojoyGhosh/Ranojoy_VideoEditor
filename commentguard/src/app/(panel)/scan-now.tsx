"use client";

import { RefreshCw } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { scanNowAction } from "./actions";

export function ScanNow() {
  return (
    <ActionForm action={scanNowAction}>
      <SubmitButton variant="secondary" className="w-full" pendingText="Scanning… (up to 40s)">
        <RefreshCw aria-hidden /> Scan now
      </SubmitButton>
    </ActionForm>
  );
}
