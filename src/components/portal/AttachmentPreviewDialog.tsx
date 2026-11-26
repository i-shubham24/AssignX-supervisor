import { useEffect, useState } from "react";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { buildDemoPreviewSvg, findSessionFile, resolveLiveAttachmentUrl, triggerFileDownload } from "@/lib/attachment-files";
import { env } from "@/lib/env";

export interface PreviewTarget {
  id?: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  scan_status?: string;
  download_url?: string | null;
  subtitle?: string;
  demoLines?: string[];
}

export function AttachmentPreviewDialog({
  item,
  open,
  onOpenChange,
}: {
  item: PreviewTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setObjectUrl(null);
    setTextBody(null);
    setLiveUrl(null);

    const file = findSessionFile(item.id, item.filename);
    let urlToRevoke: string | null = null;
    let active = true;

    if (file) {
      if (file.type.startsWith("image/")) {
        const u = URL.createObjectURL(file);
        urlToRevoke = u;
        setObjectUrl(u);
      } else if (file.type.startsWith("text/") || /\.(txt|csv|md|json)$/i.test(file.name)) {
        void file.slice(0, 64_000).text().then((txt) => {
          if (active) setTextBody(txt);
        });
      }
    } else if (!env.demoMode && item.id) {
      void resolveLiveAttachmentUrl(item.id, item.download_url).then((u) => {
        if (active) setLiveUrl(u);
      });
    }

    return () => {
      active = false;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [open, item]);

  if (!item) return null;

  const sessionFile = findSessionFile(item.id, item.filename);
  const isImage = Boolean(objectUrl) || Boolean(liveUrl && item.mime_type?.startsWith("image/"));
  const demoPreviewUrl =
    !isImage && !textBody && env.demoMode
      ? buildDemoPreviewSvg(
          item.filename,
          item.subtitle ?? "Demo document preview",
          item.demoLines ?? [
            `File type: ${item.mime_type ?? "application/octet-stream"}`,
            item.size_bytes ? `Size: ${(item.size_bytes / 1024).toFixed(0)} KB` : "Verified encrypted document",
            `Scan status: ${item.scan_status ?? "clean"}`,
            "Uploaded files store real binaries in session memory or cloud storage.",
          ],
        )
      : null;

  const handleDownload = () => {
    if (sessionFile) {
      triggerFileDownload(sessionFile, item.filename);
      return;
    }
    if (liveUrl) {
      const a = document.createElement("a");
      a.href = liveUrl;
      a.download = item.filename;
      a.target = "_blank";
      a.rel = "noreferrer noopener";
      a.click();
      return;
    }
    if (env.demoMode) {
      const content = (item.demoLines ?? [`Demo placeholder for ${item.filename}`]).join("\n");
      triggerFileDownload(new Blob([content], { type: "text/plain;charset=utf-8" }), item.filename.replace(/\.[^.]+$/, "") + "-preview.txt");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        wide
        title={item.filename}
        description={item.subtitle ?? "Scanned document preview"}
        footer={
          <>
            <span className="mr-auto flex items-center gap-1.5 text-xs text-ink-3">
              <ShieldCheck className="h-3.5 w-3.5 text-success-ink" aria-hidden="true" />
              {item.scan_status === "clean" || !item.scan_status ? "Scanned clean" : item.scan_status}
            </span>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            {(sessionFile || liveUrl || env.demoMode) ? (
              <Button variant="primary" onClick={handleDownload}>
                <Download /> Download
              </Button>
            ) : null}
          </>
        }
      >
        {isImage ? (
          <div className="overflow-hidden rounded-xl border border-line-card bg-surface-2 p-2">
            <img src={objectUrl ?? liveUrl ?? ""} alt={item.filename} className="mx-auto max-h-[60vh] rounded-lg object-contain" />
          </div>
        ) : textBody !== null ? (
          <pre className="max-h-[55vh] overflow-auto rounded-xl border border-line-card bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink">
            {textBody}
          </pre>
        ) : demoPreviewUrl ? (
          <div className="overflow-hidden rounded-xl border border-line-card bg-surface-2 p-2">
            <img src={demoPreviewUrl} alt={item.filename} className="mx-auto w-full rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-line-card bg-surface-2 p-8 text-center">
            <FileText className="h-8 w-8 text-ink-3" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink">{item.filename}</p>
            <p className="mt-1 text-xs text-ink-muted">Use Download to open this file safely on your device.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
