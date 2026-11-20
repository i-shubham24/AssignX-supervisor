import { useState } from "react";
import { useParams } from "react-router-dom";
import { Paperclip, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAction, useTrainingModule } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { ErrorState, PageHeader, Panel, ProgressBar } from "@/components/portal/kit";
import { Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { CATEGORIES, CATEGORY_SLUGS } from "@/lib/config";
import { checkUpload, cleanText, DELIVERABLE_POLICY } from "@/lib/input-safety";
import { formatRelative } from "@/lib/datetime";
import type { CategorySlug, TrainingModule, TrainingQuestion } from "@/types/domain";

/** Edit a training module: text, a video link, files and a short quiz (PRD 11.1). */
export default function TrainingEditorPage() {
  const { id = "" } = useParams();
  const { data: m, isLoading, error, refetch } = useTrainingModule(id);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !m) return <div className="skeleton h-[520px] rounded-2xl" aria-busy="true" />;
  return <Editor key={m.id} m={m} />;
}

const blankQuestion = (): TrainingQuestion => ({ id: "", prompt: "", options: ["", ""], answer: 0 });

function Editor({ m }: { m: TrainingModule }) {
  const me = useMe();
  const [title, setTitle] = useState(m.title);
  const [description, setDescription] = useState(m.description);
  const [body, setBody] = useState(m.body);
  const [video, setVideo] = useState(m.video_url ?? "");
  const [files, setFiles] = useState<string[]>(m.files);
  const [questions, setQuestions] = useState<TrainingQuestion[]>(m.questions);
  const [audience, setAudience] = useState(m.audience);
  const [category, setCategory] = useState<CategorySlug | "all">(m.categories[0] ?? "all");

  const save = useAction(
    () => api.updateModule(m.id, { title, description, body, video_url: video || null, files, questions, audience, categories: category === "all" ? [] : [category] }, me.id),
    { success: "Saved." },
  );
  const setState = useAction((next: TrainingModule["state"]) => api.setModuleState(m.id, next, me.id), { success: (_r, n) => (n === "published" ? "Published." : n === "archived" ? "Archived." : "Moved to draft.") });

  const updateQ = (i: number, fn: (q: TrainingQuestion) => TrainingQuestion) => setQuestions((qs) => qs.map((q, j) => (j === i ? fn(q) : q)));

  return (
    <>
      <PageHeader
        back={{ to: "/training", label: "Training" }}
        eyebrow={<Pill tone={m.state === "published" ? "success" : m.state === "draft" ? "warning" : "neutral"}>{m.state}</Pill>}
        title={title || "Untitled module"}
        sub={`Last saved ${formatRelative(m.updated_at)}.`}
        actions={
          <>
            <Button loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>
            {m.state !== "published" ? (
              <Button variant="primary" loading={setState.isPending} onClick={async () => { await save.mutateAsync(undefined); setState.mutate("published"); }}>Save and publish</Button>
            ) : (
              <Button variant="ghost" onClick={() => setState.mutate("archived")}>Archive</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Content">
            <div className="space-y-4">
              <Field label="Title">{({ id }) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
              <Field label="Short description">{({ id }) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} />}</Field>
              <Field label="Lesson" hint="Plain text. Leave a blank line between paragraphs.">
                {({ id, describedBy }) => <Textarea id={id} rows={12} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={describedBy} />}
              </Field>
              <Field label="Video link" hint="YouTube, Vimeo or Loom. Optional.">
                {({ id, describedBy }) => <Input id={id} value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://" aria-describedby={describedBy} spellCheck={false} />}
              </Field>
            </div>
          </Panel>

          <Panel title="Files" sub="Templates or examples doers can download.">
            {files.length ? (
              <ul className="mb-3 space-y-1.5">
                {files.map((f) => (
                  <li key={f} className="flex items-center gap-2 rounded-xl border border-line-card bg-surface-2 px-3 py-2 text-[13px]">
                    <Paperclip className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{f}</span>
                    <button className="rounded p-1 text-ink-3 hover:text-danger-ink" aria-label={`Remove ${f}`} onClick={() => setFiles((x) => x.filter((y) => y !== f))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-card bg-surface px-3 py-1.5 text-[13px] font-semibold shadow-soft-sm hover:bg-hover">
              <Upload className="h-4 w-4" aria-hidden="true" /> Add a file
              <input
                type="file"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const problem = await checkUpload(f, DELIVERABLE_POLICY);
                  if (problem) toast.error(problem);
                  else if (files.length >= 10) toast.error("Up to 10 files.");
                  else setFiles((x) => [...x, cleanText(f.name, 200)]);
                }}
              />
            </label>
          </Panel>

          <Panel title="Quiz" sub="Optional. Doers see the result; it never blocks them from work." actions={<Button size="xs" onClick={() => setQuestions((q) => [...q, blankQuestion()])}><Plus /> Add question</Button>}>
            {questions.length === 0 ? <p className="text-sm text-ink-3">No questions.</p> : null}
            <ol className="space-y-4">
              {questions.map((q, i) => (
                <li key={i} className="rounded-xl border border-line-card p-3">
                  <div className="flex items-start gap-2">
                    <Field className="flex-1" label={`Question ${i + 1}`}>
                      {({ id }) => <Input id={id} value={q.prompt} onChange={(e) => updateQ(i, (x) => ({ ...x, prompt: e.target.value }))} />}
                    </Field>
                    <button className="mt-7 rounded p-1.5 text-ink-3 hover:text-danger-ink" aria-label={`Remove question ${i + 1}`} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={`Right answer for question ${i + 1}`}>
                    {q.options.map((o, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <input type="radio" name={`answer-${i}`} checked={q.answer === k} onChange={() => updateQ(i, (x) => ({ ...x, answer: k }))} aria-label={`Answer ${k + 1} is right`} className="accent-[var(--color-primary)]" />
                        <Input className="h-8" value={o} placeholder={`Answer ${k + 1}`} onChange={(e) => updateQ(i, (x) => ({ ...x, options: x.options.map((y, n) => (n === k ? e.target.value : y)) }))} aria-label={`Answer ${k + 1}`} />
                        {q.options.length > 2 ? (
                          <button className="rounded p-1 text-ink-3 hover:text-danger-ink" aria-label={`Remove answer ${k + 1}`} onClick={() => updateQ(i, (x) => ({ ...x, options: x.options.filter((_, n) => n !== k), answer: Math.min(x.answer, x.options.length - 2) }))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {q.options.length < 5 ? (
                    <button className="mt-2 text-xs font-semibold text-primary-ink hover:underline" onClick={() => updateQ(i, (x) => ({ ...x, options: [...x.options, ""] }))}>
                      Add an answer
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-3">
          <Panel title="Who it's for">
            <div className="space-y-3">
              <Field label="Audience">{({ id }) => <Select id={id} value={audience} onChange={setAudience} options={[{ value: "doer", label: "Doers" }, { value: "supervisor", label: "Supervisors" }, { value: "both", label: "Both" }]} />}</Field>
              <Field label="Category">{({ id }) => <Select id={id} value={category} onChange={setCategory} options={[{ value: "all", label: "All categories" }, ...CATEGORY_SLUGS.map((c) => ({ value: c, label: CATEGORIES[c].label }))]} />}</Field>
            </div>
          </Panel>
          <Panel title="Completion">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-ink-3">{m.completions} done</span>
              <b className="tabular">{Math.round(m.completion_rate * 100)}%</b>
            </div>
            <ProgressBar value={m.completion_rate * 100} tone="success" className="mt-1.5" />
            {Object.keys(m.completion_by_category).length ? (
              <ul className="mt-4 space-y-2">
                {(Object.entries(m.completion_by_category) as [CategorySlug, number][]).map(([c, v]) => (
                  <li key={c}>
                    <div className="flex justify-between text-xs">
                      <span>{CATEGORIES[c].short}</span>
                      <span className="tabular text-ink-3">{Math.round(v * 100)}%</span>
                    </div>
                    <ProgressBar value={v * 100} className="mt-1" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-ink-3">Shows by category once doers complete it.</p>
            )}
          </Panel>
          {body ? (
            <Panel title="Preview">
              <div className="space-y-2 text-[13px] leading-relaxed text-ink-2">
                {body.split(/\n\s*\n/).map((para, i) => (
                  <p key={i} className="prose-plain">{para}</p>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
