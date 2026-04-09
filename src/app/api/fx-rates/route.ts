import { NextResponse } from "next/server";
import { DEFAULT_FX_RATES } from "@/lib/services/kpiService";

export async function GET() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`fx-provider-status-${response.status}`);
    }

    const data = (await response.json()) as {
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };

    const usdToHnl = data.rates?.HNL;
    const usdToEur = data.rates?.EUR;
    if (!usdToHnl || !usdToEur) throw new Error("fx-provider-missing-rates");

    return NextResponse.json({
      ok: true,
      ratesToUSD: {
        USD: 1,
        HNL: 1 / usdToHnl,
        EUR: 1 / usdToEur,
      },
      source: "open.er-api.com",
      updatedAt: data.time_last_update_utc ?? new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      ok: false,
      ratesToUSD: DEFAULT_FX_RATES,
      source: "fallback",
      updatedAt: new Date().toISOString(),
    });
  }
}
