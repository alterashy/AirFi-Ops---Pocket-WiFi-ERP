import { NextResponse } from "next/server";

// Fallback top destination countries
const FALLBACK_COUNTRIES = [
  { name: "Japan", code: "JP", flag: "", region: "Asia", dailyRate: 75000 },
  { name: "Singapore", code: "SG", flag: "", region: "Asia", dailyRate: 60000 },
  { name: "South Korea", code: "KR", flag: "", region: "Asia", dailyRate: 70000 },
  { name: "Malaysia", code: "MY", flag: "", region: "Asia", dailyRate: 50000 },
  { name: "Thailand", code: "TH", flag: "", region: "Asia", dailyRate: 55000 },
  { name: "Australia", code: "AU", flag: "", region: "Oceania", dailyRate: 90000 },
  { name: "United States", code: "US", flag: "", region: "Americas", dailyRate: 110000 },
  { name: "United Kingdom", code: "GB", flag: "", region: "Europe", dailyRate: 100000 },
  { name: "France", code: "FR", flag: "", region: "Europe", dailyRate: 95000 },
  { name: "Saudi Arabia", code: "SA", flag: "", region: "Middle East", dailyRate: 85000 },
  { name: "China", code: "CN", flag: "", region: "Asia", dailyRate: 65000 },
  { name: "Hong Kong", code: "HK", flag: "", region: "Asia", dailyRate: 65000 },
];

function getDailyRateByRegion(region: string): number {
  switch (region.toLowerCase()) {
    case "asia":
      return 65000;
    case "oceania":
      return 90000;
    case "europe":
      return 95000;
    case "americas":
      return 110000;
    case "africa":
      return 115000;
    default:
      return 80000;
  }
}

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const apiKey =
      process.env.REST_COUNTRIES_API_KEY || "rc_live_1339bb9903c749bdba98647c9eadcb91";

    const res = await fetch("https://api.restcountries.com/countries/v5?limit=100", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const list = Array.isArray(json.data?.objects)
        ? json.data.objects
        : Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : null;
      if (list && list.length > 0) {
        const formatted = (list as Array<{
          names?: { common?: string };
          name?: { common?: string };
          codes?: { alpha_2?: string };
          cca2?: string;
          flag?: { emoji?: string } | string;
          region?: string;
        }>)
          .map((c) => {
            const name = c.names?.common || c.name?.common || "Unknown";
            const code = c.codes?.alpha_2 || c.cca2 || "XX";
            const flag = typeof c.flag === "object" ? c.flag?.emoji || "" : c.flag || "";
            const region = c.region || "Global";
            return {
              name,
              code,
              flag,
              region,
              dailyRate: getDailyRateByRegion(region),
            };
          })
          .filter((c) => c.name !== "Unknown")
          .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({
          source: "restcountries-external-api-v5",
          countries: formatted,
        });
      }
    }
  } catch (error) {
    console.warn("REST Countries API timeout or network failure, using fallback:", error);
  }

  return NextResponse.json({
    source: "fallback-cache",
    countries: FALLBACK_COUNTRIES,
  });
}
