import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorStatus } from "@/backend/lib/errors";

const schema = z.object({
  eventType: z.string(),
  size: z.string(),
  colorPreference: z.string(),
  budgetCents: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const candidates = await prisma.product.findMany({
      where: {
        isPublished: true,
        basePrice: { lte: Math.max(input.budgetCents, 1000) },
      },
      include: { images: { take: 1 }, variants: { where: { isActive: true }, take: 1 }, brand: true },
      orderBy: { isFeatured: "desc" },
      take: 12,
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        recommendations: candidates.slice(0, 4).map((item) => ({
          itemId: item.id,
          title: item.title,
          brand: item.brand?.name ?? "",
          reason: `Great ${input.eventType} fit in size ${input.size} and within budget.`,
        })),
        source: "fallback",
      });
    }

    const prompt = `You are a luxury stylist. Event: ${input.eventType}. Size: ${input.size}. Color: ${input.colorPreference}. Budget cents: ${input.budgetCents}. Suggest up to 4 item ids with concise reasons from this JSON: ${JSON.stringify(
      candidates.map((i) => ({
        id: i.id,
        title: i.title,
        brand: i.brand?.name ?? "",
        category: i.categoryId ?? "",
        basePrice: i.basePrice,
      })),
    )}`;
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const raw = await res.json();
    return NextResponse.json({ output: raw, source: "openai" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Recommendation failed" },
      { status: errorStatus(error, 400) },
    );
  }
}
