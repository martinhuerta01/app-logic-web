"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Esta pantalla ahora vive en el módulo Stock nuevo
export default function Redireccion() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/stock-nuevo/talleres"); }, [router]);
  return null;
}
