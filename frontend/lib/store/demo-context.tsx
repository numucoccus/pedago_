"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Workspace, UserProfile } from "@pedago/shared";
import { DEMO_WORKSPACES, DEMO_USER } from "@/lib/constants/demo-data";

interface DemoContextType {
  isDemoMode: boolean;
  setIsDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  setActiveWorkspace: (ws: Workspace) => void;
  user: UserProfile;
  runningAnalysesCount: number;
  setRunningAnalysesCount: React.Dispatch<React.SetStateAction<number>>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(true);
  const [workspaces] = useState<Workspace[]>(DEMO_WORKSPACES);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace>(DEMO_WORKSPACES[0]);
  const [user] = useState<UserProfile>(DEMO_USER);
  const [runningAnalysesCount, setRunningAnalysesCount] = useState<number>(0);

  useEffect(() => {
    const stored = localStorage.getItem("pedago_demo_mode");
    if (stored !== null) {
      setIsDemoModeState(stored === "true");
    }
    const storedWsId = localStorage.getItem("pedago_active_ws");
    if (storedWsId) {
      const found = DEMO_WORKSPACES.find((w) => w.id === storedWsId);
      if (found) setActiveWorkspaceState(found);
    }
  }, []);

  const setIsDemoMode = (val: boolean) => {
    setIsDemoModeState(val);
    localStorage.setItem("pedago_demo_mode", String(val));
  };

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
  };

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    localStorage.setItem("pedago_active_ws", ws.id);
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        setIsDemoMode,
        toggleDemoMode,
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        user,
        runningAnalysesCount,
        setRunningAnalysesCount,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
