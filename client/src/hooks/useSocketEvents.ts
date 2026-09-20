"use client";

import { useEffect, useRef } from "react";

import { socket } from "@/lib/socket";

type SocketHandler = Parameters<typeof socket.on>[1];

export function useSocketEvents(handlers: Record<string, SocketHandler>) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const events = Object.keys(handlersRef.current);
    const listeners: Record<string, SocketHandler> = {};

    for (const event of events) {
      const listener = (...args: Parameters<SocketHandler>) => {
        handlersRef.current[event]?.(...args);
      };
      listeners[event] = listener;
      socket.on(event, listener);
    }

    return () => {
      for (const event of events) {
        const listener = listeners[event];
        if (listener) socket.off(event, listener);
      }
    };
  }, []);
}
