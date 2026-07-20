"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteCameraButtonProps = {
  id: string;
  label: string;
  confirmText: string;
};

export function DeleteCameraButton({ id, label, confirmText }: DeleteCameraButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(confirmText)) return;
    setPending(true);
    try {
      await fetch(`/api/cameras/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="text-xs font-medium text-rose-600 transition hover:text-rose-700 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
