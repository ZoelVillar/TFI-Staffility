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
  { params }: { params: Promise<{ id: string }> } // Correcto: params es Promise
) {
  const { user, companyId } = await requireCompanyScope();
  
  // 1. Desempaquetamos los params con await
  const { id } = await params;

  const { ok, camp, reason } = await isUserInTarget(id, user.id, companyId);

  if (!ok || !camp) {
    return new NextResponse(reason ?? "No autorizado", { status: 403 });
  }

  // Buscar respuesta existente
  const already = await prisma.surveyResponse.findFirst({
    where: { campaignId: camp.id, userId: user.id },
    select: { id: true, submittedAt: true, scoreTotal: true },
  });

  const now = new Date();
  const isExpired = camp.status === "CLOSED" || new Date(camp.endDate) < now;
  const isCompleted = !!already;

  // Lógica de estado unificada
  let myStatus: "PENDING" | "COMPLETED" | "EXPIRED" = "PENDING";
  if (isCompleted) myStatus = "COMPLETED";
  else if (isExpired) myStatus = "EXPIRED";

  // Solo enviamos el JSON de preguntas si está PENDING
  const surveyContent = myStatus === "PENDING" ? getSurvey() : null;

  return NextResponse.json({
    meta: {
      name: camp.name,
      startDate: camp.startDate,
      endDate: camp.endDate,
      status: camp.status,
    },
    myStatus,
    already,
    survey: surveyContent, 
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Corregido: Tipo Promise
) {
  const { user, companyId } = await requireCompanyScope();
  
  // 1. Corregido: Desempaquetamos params con await antes de usarlo
  const { id } = await params;

  const { ok, camp, reason } = await isUserInTarget(
    id, // Usamos la variable desempaquetada
    user.id,
    companyId
  );
  
  if (!ok || !camp)
    return new NextResponse(reason ?? "No autorizado", { status: 403 });

  // bloqueos
  const now = new Date();
  if (camp.status === "CLOSED" || new Date(camp.endDate) < now) {
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

  // Calculamos score usando la librería actualizada (con dimensiones si aplicaste la Fase 3)
  const { score0to100 } = scoreSurvey(answers);

  const saved = await prisma.surveyResponse.create({
    data: {
      campaignId: camp.id,
      userId: user.id,
      scoreTotal: score0to100.toFixed(2),
      answers, // Guardamos el JSON para analíticas futuras (Radar chart)
    },
  });

  return NextResponse.json({
    ok: true,
    responseId: saved.id,
    score: Number(saved.scoreTotal),
  });
}