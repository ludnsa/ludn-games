"use client";

import React from "react";

import { useAdminMessages } from "@/hooks/admin/messages/useAdminMessages";
import AdminShell from "@/components/admin/layout/AdminShell";
import MessagesHeader from "@/components/admin/messages/MessagesHeader";
import MessagesContent from "@/components/admin/messages/MessagesContent";

export default function AdminMessagesPage() {
  const ctx = useAdminMessages();

  return (
    <AdminShell>
      <MessagesHeader ctx={ctx} />
      <MessagesContent ctx={ctx} />
    </AdminShell>
  );
}
