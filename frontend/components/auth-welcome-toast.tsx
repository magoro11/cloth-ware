"use client";

import { useEffect } from "react";
import { useToast } from "@/components/toast-provider";

const AUTH_WELCOME_MESSAGE_KEY = "auth-welcome-message";

export function AuthWelcomeToast() {
  const { pushToast } = useToast();

  useEffect(() => {
    const message = window.sessionStorage.getItem(AUTH_WELCOME_MESSAGE_KEY);
    if (!message) return;

    pushToast(message);
    window.sessionStorage.removeItem(AUTH_WELCOME_MESSAGE_KEY);
  }, [pushToast]);

  return null;
}
