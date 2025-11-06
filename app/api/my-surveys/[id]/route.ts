// app/api/my-surveys/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireCompanyScope } from "@/lib/session";
import { getSurvey, scoreSurvey } from "@/lib/survey";

/** Verifica si el user forma parte del target de la campaña */
async function isUserInTarget(
  campaignId: string,
  userId: string,
  companyId: string
) {
  const camp = await prisma.campaign.findFirst({
    where: { id: campaignId, companyId },
    include: { targets: true },
  });
  if (!camp) return { ok: false, reason: "Campaña no encontrada" };

  if (camp.scope === "ALL") {
    return { ok: true, camp };
  }

  const myTeams = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = new Set(myTeams.map((t) => t.teamId));
  const included = camp.targets.some((t) => teamIds.has(t.teamId));
  return {
    ok: included,
    camp,
    reason: included ? undefined : "No perteneces al target",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  const { ok, camp, reason } = await isUserInTarget(
    params.id,
    user.id,
    companyId
  );
  if (!ok || !camp) {
    return new NextResponse(reason ?? "No autorizado", { status: 403 });
  }

  // si ya respondió, devolvemos meta para que UI muestre “ya completada”
  const already = await prisma.surveyResponse.findFirst({
    where: { campaignId: camp.id, userId: user.id },
    select: { id: true, submittedAt: true, scoreTotal: true },
  });

  const now = new Date();
  const closed = camp.status === "CLOSED" || camp.endDate < now;

  return NextResponse.json({
    campaign: {
      id: camp.id,
      name: camp.name,
      startDate: camp.startDate,
      endDate: camp.endDate,
      status: closed ? "CLOSED" : "ACTIVE",
    },
    already,
    survey: closed || already ? null : getSurvey(), // sólo enviamos el cuestionario si puede responder
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, companyId } = await requireCompanyScope();
  const { ok, camp, reason } = await isUserInTarget(
    params.id,
    user.id,
    companyId
  );
  if (!ok || !camp)
    return new NextResponse(reason ?? "No autorizado", { status: 403 });

  // bloqueos
  const now = new Date();
  if (camp.status === "CLOSED" || camp.endDate < now) {
    return new NextResponse("La campaña está cerrada o vencida", {
      status: 400,
    });
  }
  const exists = await prisma.surveyResponse.findFirst({
    where: { campaignId: camp.id, userId: user.id },
    select: { id: true },
  });
  if (exists) {
    return new NextResponse("Ya has respondido esta encuesta", { status: 409 });
  }

  const body = await req.json();
  // answers: { [questionId]: number }
  const answers = (body?.answers ?? {}) as Record<string, number>;

  const { score0to100 } = scoreSurvey(answers);

  const saved = await prisma.surveyResponse.create({
    data: {
      campaignId: camp.id,
      userId: user.id,
      scoreTotal: score0to100.toFixed(2),
      answers, // opcional: puedes eliminar si no querés guardar
    },
  });

  return NextResponse.json({
    ok: true,
    responseId: saved.id,
    score: Number(saved.scoreTotal),
  });
}
