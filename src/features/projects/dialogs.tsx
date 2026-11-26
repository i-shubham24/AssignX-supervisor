import { useState } from "react";
import { ImagePlus } from "lucide-react";
import type { Project, ProjectDoer } from "@/types/domain";
import { useAction } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Code, SideTag } from "@/components/portal/pills";
import { toast } from "sonner";
import { checkUpload, redrawImage, SNAPSHOT_POLICY } from "@/lib/input-safety";
import { checkWorkspaceUrl } from "@/lib/safe-url";

/** BR-018: the workspace is company owned; the doer joins with an anonymous identity. */
export function WorkingLinkDialog({ assignment, open, onOpenChange }: { assignment: ProjectDoer; open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = useMe();
  const [url, setUrl] = useState(assignment.working_link ?? "");
  const check = url.trim() ? checkWorkspaceUrl(url) : null;
  // Allocated from the anonymous login pool when the doer accepted (PRD 11.2).
  const identity = assignment.workspace_identity ?? "a workspace login from the pool";
  const save = useAction(() => api.setWorkingLink(assignment.id, url, me.id), {
    success: `Working link saved. ${assignment.doer_code} can start.`,
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={<>Set the working link for <Code className="text-ink">{assignment.doer_code}</Code></>}
        description="The doer cannot start without it."
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined)} disabled={!check?.ok}>Save link</Button>
          </>
        }
      >
        <ol className="mb-4 space-y-2 text-[13px] text-ink-2">
          <li><b>1.</b> Create the file in a company account, not the doer's.</li>
          <li><b>2.</b> Give edit access to <Code className="text-ink">{identity}</Code>.</li>
          <li><b>3.</b> Paste the link below.</li>
        </ol>
        <Field label="Workspace URL" required error={check && !check.ok ? check.reason : null} hint={check?.ok ? `Approved workspace: ${check.host}` : "Figma, Google Docs, Canva, GitHub or Drive. Must start with https."}>
          {({ id, describedBy, invalid }) => <Input id={id} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" aria-describedby={describedBy} aria-invalid={invalid} autoFocus spellCheck={false} />}
        </Field>
        <div className="mt-3"><SideTag side="internal">Client never sees this</SideTag></div>
      </DialogContent>
    </Dialog>
  );
}

export function ProgressDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = useMe();
  const [pct, setPct] = useState(project.progress_percent ?? 0);
  const [label, setLabel] = useState(project.progress_label ?? "");
  const save = useAction(() => api.updateProgress(project.id, pct, label, me.id), { success: "Progress updated. The client can see it.", onSuccess: () => onOpenChange(false) });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Update progress"
        description="The client sees this."
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate(undefined)}>Publish to client</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={`Progress: ${pct}%`}>
            {({ id }) => <input id={id} type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />}
          </Field>
          <Field label="Stage label" required hint="For example: First concepts ready">
            {({ id, describedBy }) => <Input id={id} value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} aria-describedby={describedBy} />}
          </Field>
          <SideTag side="client" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SnapshotDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = useMe();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const post = useAction(
    async () => {
      if (!file) throw new Error("PORTAL: Choose an image first.");
      const { rememberSessionFile } = await import("@/lib/attachment-files");
      rememberSessionFile(file.name, file);
      return api.postSnapshot(project.id, file, note, me.id);
    },
    {
      success: "Snapshot sent to the client.",
      onSuccess: () => {
        onOpenChange(false);
        setFile(null);
        setNote("");
      },
    },
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Post a snapshot"
        description="Posts to the client chat."
        footer={
          <>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="client" loading={post.isPending} disabled={!file} onClick={() => post.mutate(undefined)}>Post to client</Button>
          </>
        }
      >
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line-card bg-surface-2 px-4 py-8 text-center transition-colors hover:border-client/50">
          <ImagePlus className="h-6 w-6 text-ink-3" aria-hidden="true" />
          <span className="mt-2 text-sm font-semibold">{file?.name ?? "Choose an image"}</span>
          <span className="mt-0.5 text-xs text-ink-3">A flat PNG, JPG or WebP image.</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const problem = await checkUpload(f, SNAPSHOT_POLICY);
              if (problem) {
                toast.error(problem);
                return;
              }
              // Redraw strips authorship, camera and location metadata (BR-019).
              try {
                const clean = await redrawImage(f);
                setFile(clean);
              } catch {
                toast.error("Could not read that image. Export it again as PNG or JPG.");
              }
            }}
          />
        </label>
        <Field className="mt-4" label="Note for the client" hint="What they are looking at.">
          {({ id, describedBy }) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} rows={2} aria-describedby={describedBy} />}
        </Field>
      </DialogContent>
    </Dialog>
  );
}
