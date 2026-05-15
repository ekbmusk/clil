import SingleChoice from './SingleChoice';
import FillBlank from './FillBlank';
import Matching from './Matching';
import Classification from './Classification';
import Ordering from './Ordering';

const REGISTRY = {
  single_choice: SingleChoice,
  fill_blank: FillBlank,
  matching: Matching,
  classification: Classification,
  ordering: Ordering,
};

// Backend ships type-specific fields nested under `task.payload` (prompt,
// options, items, correct_answers, etc.). Renderers expect them flat, so we
// merge payload onto task before handing it off.
function flatten(task) {
  if (!task) return task;
  return { ...(task.payload || {}), ...task };
}

export function isAnswerValid(task, value) {
  const flat = flatten(task);
  const Comp = REGISTRY[flat?.type];
  if (!Comp || !Comp.isValid) return false;
  return Comp.isValid(value, flat);
}

export default function TaskRenderer({ task, value, onChange, isDisabled }) {
  const flat = flatten(task);
  const Comp = REGISTRY[flat?.type];
  if (!Comp) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        Unknown task type: <code>{flat?.type}</code>
      </div>
    );
  }
  return (
    <Comp task={flat} value={value} onChange={onChange} isDisabled={isDisabled} />
  );
}
