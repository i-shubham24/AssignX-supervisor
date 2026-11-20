import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Kbd } from "@/components/portal/pills";
import { useUiStore } from "@/stores/useUiStore";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Search" },
  { keys: ["/"], label: "Search" },
  { keys: ["Ctrl", "B"], label: "Show or hide the menu" },
  { keys: ["j", "k"], label: "Move down or up a list" },
  { keys: ["Enter"], label: "Open the selected row" },
  { keys: ["g", "d"], label: "Go to the dashboard" },
  { keys: ["?"], label: "Show this help" },
];

const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Global keyboard shortcuts. Ignored while typing in a field. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        setCommandOpen(true);
      } else if (e.key === "g") {
        lastG = Date.now();
      } else if (e.key === "d" && Date.now() - lastG < 800) {
        navigate("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, setCommandOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="Keyboard shortcuts">
        <ul className="divide-y divide-line-subtle">
          {SHORTCUTS.map((s) => (
            <li key={s.label + s.keys.join()} className="flex items-center justify-between py-2 text-[13.5px]">
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
