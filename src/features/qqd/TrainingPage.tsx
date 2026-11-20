import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAction, useTraining } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, ProgressBar } from "@/components/portal/kit";
import { CategoryBadge, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { CATEGORIES, CATEGORY_SLUGS } from "@/lib/config";
import { formatRelative } from "@/lib/datetime";
import type { CategorySlug, TrainingModule } from "@/types/domain";

/**
 * Create, publish and archive modules for doers and supervisors (FR-SV-013).
 * Training never gates onboarding or offers at platform level (BR-022); a supervisor
 * may require a module for one specific project.
 */
export default function TrainingPage() {
  const { data, isLoading } = useTraining();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Training"
        sub="Optional for everyone. You can require it for one project only."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus /> New module</Button>}
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{(data ?? []).map((m) => <ModuleCard key={m.id} m={m} />)}</div>
      )}
      <NewModuleDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ModuleCard({ m }: { m: TrainingModule }) {
  const me = useMe();
  const set = useAction((next: TrainingModule["state"]) => api.setModuleState(m.id, next, me.id), { success: (_r, n) => `Module ${n}.` });
  return (
    <section className="flex flex-col rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm">
      <div className="flex items-center gap-2">
        <Pill tone={m.state === "published" ? "success" : m.state === "draft" ? "warning" : "neutral"} className="ml-auto">{m.state}</Pill>
      </div>
      <h3 className="mt-3 text-[15px] font-bold">
        <Link to={`/training/${m.id}`} className="hover:text-primary-ink hover:underline">{m.title}</Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-muted">{m.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        <Pill tone="info" dot={false}>For {m.audience === "both" ? "doers and supervisors" : `${m.audience}s`}</Pill>
        {m.categories.length ? m.categories.map((c) => <CategoryBadge key={c} category={c} short />) : <Pill dot={false}>All categories</Pill>}
        {m.has_assessment ? <Pill tone="violet" dot={false}>Assessment</Pill> : null}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11.5px]"><span className="text-ink-3">{m.completions} completions</span><b className="tabular">{Math.round(m.completion_rate * 100)}%</b></div>
        <ProgressBar value={m.completion_rate * 100} tone="success" />
      </div>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <span className="text-[11.5px] text-ink-3">Updated {formatRelative(m.updated_at)}</span>
        <Button asChild size="xs" variant="ghost" className="ml-auto"><Link to={`/training/${m.id}`}>Edit</Link></Button>
        {m.state === "draft" ? <Button size="xs" variant="primary" onClick={() => set.mutate("published")}>Publish</Button> : null}
        {m.state === "published" ? <Button size="xs" onClick={() => set.mutate("archived")}>Archive</Button> : null}
        {m.state === "archived" ? <Button size="xs" onClick={() => set.mutate("published")}>Restore</Button> : null}
      </div>
    </section>
  );
}

function NewModuleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = useMe();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<TrainingModule["audience"]>("doer");
  const [category, setCategory] = useState<CategorySlug | "all">("all");
  const [assessment, setAssessment] = useState(false);
  const create = useAction(() => api.createModule({ title, description, audience, categories: category === "all" ? [] : [category], has_assessment: assessment }, me.id), {
    success: "Draft created. Add content, then publish.",
    onSuccess: (mod) => {
      onOpenChange(false);
      navigate(`/training/${mod.id}`);
      setTitle("");
      setDescription("");
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New training module" footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" loading={create.isPending} onClick={() => create.mutate(undefined)}>Create draft</Button></>}>
        <div className="space-y-4">
          <Field label="Title" required>{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />}</Field>
          <Field label="Description">{({ id }) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}</Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Audience">{({ id }) => <Select id={id} value={audience} onChange={setAudience} options={[{ value: "doer", label: "Doers" }, { value: "supervisor", label: "Supervisors" }, { value: "both", label: "Both" }]} />}</Field>
            <Field label="Category">{({ id }) => <Select id={id} value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, ...CATEGORY_SLUGS.map((c) => ({ value: c, label: CATEGORIES[c].label }))]} />}</Field>
          </div>
          <Checkbox checked={assessment} onChange={setAssessment} label="Include a short assessment" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
