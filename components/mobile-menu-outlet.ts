"use client";
import { createContext, useContext } from "react";

export const MobileMenuOutlet = createContext<HTMLDivElement | null>(null);
export const useMobileMenuOutlet = () => useContext(MobileMenuOutlet);
