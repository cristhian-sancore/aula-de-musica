"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button 
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })} 
      className="nav-link logout"
      style={{
        background: "transparent",
        border: "none",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "inherit"
      }}
    >
      <LogOut size={20} />
      <span>Sair</span>
    </button>
  );
}
