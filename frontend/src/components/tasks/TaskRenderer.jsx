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

export function isAnswerValid(task, value) {
  const Comp = REGISTRY[task?.type];
  if (!Comp || !Comp.isValid) return false;
  return Comp.isValid(value, task);
}

export default function TaskRenderer({ task, value, onChange, isDisabled }) {
  const Comp = REGISTRY[task?.type];
  if (!Comp) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        Unknown task type: <code>{task?.type}</code>
      </div>
    );
  }
  return (
    <Comp task={task} value={value} onChange={onChange} isDisabled={isDisabled} />
  );
}
