import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import {
  type AdminExercise,
  type AdminExerciseSet,
  type AdminLesson,
  useAdminContent,
  useAdminStageContent,
  useDeleteExercise,
  useDeleteExerciseSet,
  useDeleteLesson,
  useEditExercise,
  useWipeAllContent,
} from '../../hooks/use-admin'
import { cn } from '../../lib/utils'

// ── Exercise Edit Modal ──────────────────────────────────────────────────────

function ExerciseEditModal({
  exercise,
  parentId,
  parentType,
  onClose,
}: {
  exercise: AdminExercise
  parentId: string
  parentType: 'lesson' | 'exercise-set'
  onClose: () => void
}) {
  const [form, setForm] = useState({
    question: exercise.question,
    answer: exercise.answer,
    acceptedAnswers: (exercise.acceptedAnswers ?? []).join('\n'),
    wrongFeedback: exercise.wrongFeedback ?? '',
    correctFeedback: exercise.correctFeedback ?? '',
    hint: exercise.hint ?? '',
    explanation: exercise.explanation ?? '',
    passage: exercise.passage ?? '',
    options: (exercise.options ?? []).join('\n'),
  })

  const { mutate: editExercise, isPending } = useEditExercise(parentType)

  const handleSave = () => {
    const patch: Partial<AdminExercise> = {
      question: form.question,
      answer: form.answer,
      wrongFeedback: form.wrongFeedback || undefined,
      correctFeedback: form.correctFeedback || undefined,
      hint: form.hint || undefined,
      explanation: form.explanation || undefined,
      passage: form.passage || undefined,
      acceptedAnswers: form.acceptedAnswers.trim()
        ? form.acceptedAnswers
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      options: form.options.trim()
        ? form.options
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    }
    editExercise({ parentId, exerciseId: exercise.id, patch }, { onSuccess: onClose })
  }

  const field = (label: string, key: keyof typeof form, rows = 1) => (
    <div>
      <label htmlFor={`field-${key}`} className="block text-xs text-slate-400 mb-1">
        {label}
      </label>
      {rows === 1 ? (
        <input
          id={`field-${key}`}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:border-amber-400"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <textarea
          id={`field-${key}`}
          rows={rows}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none resize-y focus:border-amber-400"
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <p className="text-xs text-amber-400 uppercase tracking-wide font-medium">
              {exercise.type.replace(/_/g, ' ')}
            </p>
            <h2 className="text-white font-semibold">Edit Exercise</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {exercise.passage !== undefined && field('Passage (reading text)', 'passage', 4)}
          {field('Question', 'question', 2)}
          {field('Correct Answer', 'answer')}
          {exercise.options !== undefined && (
            <div>
              <label htmlFor="field-options" className="block text-xs text-slate-400 mb-1">
                Options (one per line)
              </label>
              <textarea
                id="field-options"
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none resize-y focus:border-amber-400"
                value={form.options}
                onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
              />
            </div>
          )}
          <div>
            <label htmlFor="field-acceptedAnswers" className="block text-xs text-slate-400 mb-1">
              Accepted Alternatives (one per line)
            </label>
            <textarea
              id="field-acceptedAnswers"
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none resize-y focus:border-amber-400"
              value={form.acceptedAnswers}
              onChange={(e) => setForm((f) => ({ ...f, acceptedAnswers: e.target.value }))}
            />
          </div>
          {field('Wrong Feedback (shown when incorrect)', 'wrongFeedback', 2)}
          {field('Correct Feedback (shown even when correct)', 'correctFeedback', 2)}
          {field('Hint', 'hint')}
          {field('Explanation', 'explanation', 2)}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 py-2.5 bg-amber-400 text-slate-950 rounded-xl text-sm font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  exercise,
  parentId,
  parentType,
}: {
  exercise: AdminExercise
  parentId: string
  parentType: 'lesson' | 'exercise-set'
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: del, isPending: isDeleting } = useDeleteExercise(parentType)

  return (
    <>
      {editing && (
        <ExerciseEditModal
          exercise={exercise}
          parentId={parentId}
          parentType={parentType}
          onClose={() => setEditing(false)}
        />
      )}
      <div className="flex items-start gap-3 py-2.5 px-3 bg-slate-800/40 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
        <span className="text-xs text-amber-400/70 uppercase tracking-wide font-medium pt-0.5 shrink-0 w-28">
          {exercise.type.replace(/_/g, ' ')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 truncate">{exercise.question}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">→ {exercise.answer}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors rounded"
            title="Edit exercise"
          >
            <Pencil size={13} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  del(
                    { parentId, exerciseId: exercise.id },
                    { onSuccess: () => setConfirmDelete(false) },
                  )
                }
                disabled={isDeleting}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? '...' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
              title="Delete exercise"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── Lesson Card ──────────────────────────────────────────────────────────────

function LessonCard({ lesson }: { lesson: AdminLesson }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: del, isPending: isDeleting } = useDeleteLesson()

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center bg-slate-900 hover:bg-slate-800/60 transition-colors">
        <button
          type="button"
          className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDown size={14} className="text-slate-500 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-slate-500 shrink-0" />
          )}
          <BookOpen size={14} className="text-amber-400/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{lesson.title}</p>
            <p className="text-xs text-slate-500">
              {lesson.type} · {lesson.exerciseCount} exercises{lesson.isAiGenerated ? ' · AI' : ''}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2 pr-3 shrink-0">
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => del(lesson._id, { onSuccess: () => setConfirmDelete(false) })}
                disabled={isDeleting}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? '...' : 'Delete lesson'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="Delete lesson"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 bg-slate-900/50 space-y-2 border-t border-slate-800">
          {lesson.exercises.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No exercises</p>
          )}
          {lesson.exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} parentId={lesson._id} parentType="lesson" />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Exercise Set Card ─────────────────────────────────────────────────────────

function ExerciseSetCard({ set }: { set: AdminExerciseSet }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: del, isPending: isDeleting } = useDeleteExerciseSet()

  const difficultyColor =
    set.difficulty === 'easy'
      ? 'text-emerald-400'
      : set.difficulty === 'medium'
        ? 'text-amber-400'
        : 'text-red-400'

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center bg-slate-900 hover:bg-slate-800/60 transition-colors">
        <button
          type="button"
          className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDown size={14} className="text-slate-500 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-slate-500 shrink-0" />
          )}
          <Layers size={14} className="text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{set.topic}</p>
            <p className="text-xs text-slate-500">
              <span className={cn('font-medium', difficultyColor)}>{set.difficulty}</span>
              {' · '}
              {set.exerciseCount} exercises{' · '}served {set.timesServed}×
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2 pr-3 shrink-0">
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => del(set._id, { onSuccess: () => setConfirmDelete(false) })}
                disabled={isDeleting}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? '...' : 'Delete set'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              title="Delete exercise set"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 bg-slate-900/50 space-y-2 border-t border-slate-800">
          {set.exercises.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-4">No exercises</p>
          )}
          {set.exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} parentId={set._id} parentType="exercise-set" />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Stage Detail Panel ────────────────────────────────────────────────────────

function StageDetailPanel({ stageId }: { stageId: string }) {
  const [tab, setTab] = useState<'lessons' | 'sets'>('lessons')
  const { data, isLoading } = useAdminStageContent(stageId)

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-amber-400" />
      </div>
    )
  if (!data) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{data.stage.emoji}</span>
        <div>
          <h2 className="text-base font-semibold text-white">{data.stage.theme}</h2>
          <p className="text-xs text-slate-500">{data.stage.cefrLevel}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-slate-800 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setTab('lessons')}
          className={cn(
            'flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'lessons' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white',
          )}
        >
          Lessons ({data.lessons.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('sets')}
          className={cn(
            'flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'sets' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white',
          )}
        >
          Practice Sets ({data.exerciseSets.length})
        </button>
      </div>

      {tab === 'lessons' && (
        <div className="space-y-2">
          {data.lessons.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">No lessons for this stage</p>
          )}
          {data.lessons.map((l) => (
            <LessonCard key={l._id} lesson={l} />
          ))}
        </div>
      )}
      {tab === 'sets' && (
        <div className="space-y-2">
          {data.exerciseSets.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-8">
              No practice sets generated yet
            </p>
          )}
          {data.exerciseSets.map((s) => (
            <ExerciseSetCard key={s._id} set={s} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function AdminContentPage() {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [wipeConfirm, setWipeConfirm] = useState(false)
  const { data: stages, isLoading } = useAdminContent()
  const { mutate: wipeAll, isPending: isWiping } = useWipeAllContent()

  const handleWipe = () => {
    wipeAll(undefined, {
      onSuccess: (res) => {
        setWipeConfirm(false)
        setSelectedStageId(null)
        alert(
          `Wiped ${res.deletedLessons} lessons and ${res.deletedExerciseSets} practice sets. The queue will regenerate content automatically.`,
        )
      },
    })
  }

  return (
    <AdminLayout>
      <div className="px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Content Management</h1>
            <p className="text-slate-400 mt-1">
              View and edit lessons, exercises, and practice sets by stage
            </p>
          </div>

          <div className="flex items-center gap-3">
            {wipeConfirm ? (
              <>
                <span className="text-sm text-red-400">Delete all AI content?</span>
                <button
                  type="button"
                  onClick={handleWipe}
                  disabled={isWiping}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {isWiping ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Yes, wipe all
                </button>
                <button
                  type="button"
                  onClick={() => setWipeConfirm(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setWipeConfirm(true)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 text-red-400 rounded-xl text-sm font-medium hover:bg-slate-700 hover:border-red-400/30 transition-colors flex items-center gap-2"
              >
                <Trash2 size={14} />
                Wipe all content
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Stage list */}
          <div className="w-full md:w-72 shrink-0">
            <h2 className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
              Stages
            </h2>
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-amber-400" />
              </div>
            )}
            {/* Mobile: horizontal scroll chips */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {stages?.map((stage) => (
                <button
                  type="button"
                  key={stage._id}
                  onClick={() => setSelectedStageId(stage._id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors border',
                    selectedStageId === stage._id
                      ? 'bg-amber-400/10 border-amber-400/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700',
                  )}
                >
                  <span className="text-base">{stage.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white whitespace-nowrap">
                      {stage.theme}
                    </p>
                    <p className="text-xs text-slate-500">{stage.cefrLevel}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: vertical list */}
            <div className="hidden md:block space-y-1">
              {stages?.map((stage) => (
                <button
                  type="button"
                  key={stage._id}
                  onClick={() => setSelectedStageId(stage._id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                    selectedStageId === stage._id
                      ? 'bg-amber-400/10 border border-amber-400/30'
                      : 'hover:bg-slate-800 border border-transparent',
                  )}
                >
                  <span className="text-lg shrink-0">{stage.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{stage.theme}</p>
                    <p className="text-xs text-slate-500">
                      {stage.cefrLevel} · {stage.lessonCount}L · {stage.exerciseSetCount}S
                    </p>
                  </div>
                  {selectedStageId === stage._id && (
                    <ChevronRight size={14} className="text-amber-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            {selectedStageId ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <StageDetailPanel key={selectedStageId} stageId={selectedStageId} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertTriangle size={32} className="text-slate-700 mb-3" />
                <p className="text-slate-500">Select a stage from the left to manage its content</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
