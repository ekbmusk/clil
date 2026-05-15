import { useEffect } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import clsx from 'clsx';

// answer shape: { order: [origIndex, origIndex, ...] }
// `order[i]` is the original index of the item that ends up at display position i.
export default function Ordering({ task, value, onChange, isDisabled }) {
  const items = task.items ?? [];
  const order = value?.order ?? items.map((_, i) => i);

  // Initialize order if not set.
  useEffect(() => {
    if (!value?.order) {
      onChange({ order: items.map((_, i) => i) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.external_id]);

  const move = (from, to) => {
    if (to < 0 || to >= order.length) return;
    const next = order.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ order: next });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    move(result.source.index, result.destination.index);
  };

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold leading-snug text-ink">{task.prompt}</p>
      <p className="text-xs text-ink-muted">Тарт-таста — дұрыс ретпен қой</p>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="ordering" isDropDisabled={isDisabled}>
          {(provided) => (
            <ol
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {order.map((origIdx, displayIdx) => (
                <Draggable
                  key={origIdx}
                  draggableId={String(origIdx)}
                  index={displayIdx}
                  isDragDisabled={isDisabled}
                >
                  {(prov, snapshot) => (
                    <li
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className={clsx(
                        'flex items-center gap-3 rounded-2xl border bg-surface-2 px-3 py-3 text-[14px] text-ink shadow-sm',
                        snapshot.isDragging
                          ? 'border-primary shadow-lg'
                          : 'border-border',
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-xs text-ink-muted">
                        {displayIdx + 1}
                      </span>
                      <span className="flex-1 leading-snug">{items[origIdx]}</span>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => move(displayIdx, displayIdx - 1)}
                          disabled={isDisabled || displayIdx === 0}
                          className="rounded-md bg-surface px-2 py-0.5 text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                          aria-label="up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => move(displayIdx, displayIdx + 1)}
                          disabled={isDisabled || displayIdx === order.length - 1}
                          className="rounded-md bg-surface px-2 py-0.5 text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                          aria-label="down"
                        >
                          ▼
                        </button>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ol>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

Ordering.isValid = (value, task) =>
  !!(value?.order && value.order.length === (task?.items ?? []).length);
