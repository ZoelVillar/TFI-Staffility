// components/app/employees/EmployeeCard.tsx
"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EmployeeCard({
  emp,
}: {
  emp: {
    id: string;
    name: string | null;
    email: string;
    position: string | null;
    image: string | null;
    phone: string | null;
    department: string | null;
    workMode: string | null;
    status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  };
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex gap-3">
        <div className="relative w-14 h-14 rounded-full overflow-hidden border shrink-0">
          <Image
            src={
              emp.image ||
              `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
                emp.name ?? emp.email
              )}&size=96&radius=50`
            }
            alt={emp.name ?? emp.email}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">
              {emp.name ?? "Sin nombre"}
            </div>
            <Badge
              variant={
                emp.status === "ACTIVE"
                  ? "default"
                  : emp.status === "INACTIVE"
                  ? "destructive"
                  : "secondary"
              }
            >
              {emp.status === "ACTIVE"
                ? "Activo"
                : emp.status === "INACTIVE"
                ? "Inactivo"
                : "Licencia"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {emp.email}
          </div>
          {emp.position && (
            <div className="text-sm mt-1">
              {emp.position}
              {emp.department ? ` · ${emp.department}` : ""}
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {emp.phone ? emp.phone : ""}
            {emp.workMode ? (emp.phone ? " · " : "") + emp.workMode : ""}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
