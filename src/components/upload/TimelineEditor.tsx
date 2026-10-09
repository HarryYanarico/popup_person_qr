import { useState } from 'react';
import es from '../../locales/es.json';
import { Button } from '../ui/Button';
import { useProjectStore } from '../../store/useProjectStore';
import type { TimelineMessage } from '../../types/project';

const inputClass =
  'mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none';

export function TimelineEditor() {
  const messages = useProjectStore((s) => s.draft.messages);
  const addMessage = useProjectStore((s) => s.addMessage);
  const updateMessage = useProjectStore((s) => s.updateMessage);
  const removeMessage = useProjectStore((s) => s.removeMessage);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number>(0);
  const [duration, setDuration] = useState<number>(3);
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>('top');
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleEditClick = (msg: TimelineMessage) => {
    setEditingId(msg.id);
    setTimestamp(msg.timestamp);
    setDuration(msg.duration);
    setPosition(msg.position);
    setContent(msg.content);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTimestamp(0);
    setDuration(3);
    setPosition('top');
    setContent('');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError(es.upload.contentRequired);
      return;
    }
    if (timestamp < 0) {
      setError('El timestamp debe ser mayor o igual a 0.');
      return;
    }
    if (duration <= 0) {
      setError('La duración debe ser mayor a 0 segundos.');
      return;
    }

    if (editingId) {
      updateMessage(editingId, {
        timestamp: Number(timestamp),
        duration: Number(duration),
        position,
        content: content.trim(),
        type: 'text',
      });
      handleCancelEdit();
    } else {
      addMessage({
        timestamp: Number(timestamp),
        duration: Number(duration),
        position,
        content: content.trim(),
        type: 'text',
      });
      // Avanzar timestamp sugerido en 3 segundos para facilitar la creación secuencial
      setTimestamp((prev) => Number((Number(prev) + Number(duration) + 1).toFixed(1)));
      setContent('');
      setError(null);
    }
  };

  const positionBadgeLabel = (pos: 'top' | 'center' | 'bottom') => {
    switch (pos) {
      case 'top':
        return es.upload.positionTop;
      case 'center':
        return es.upload.positionCenter;
      case 'bottom':
        return es.upload.positionBottom;
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100">{es.upload.timelineTitle}</h2>
        <p className="mt-1 text-xs text-zinc-400">{es.upload.timelineHint}</p>
      </header>

      {/* Formulario para añadir o editar mensaje */}
      <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <h3 className="text-sm font-medium text-indigo-400">
          {editingId ? es.upload.editMessage : es.upload.addMessage}
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300" htmlFor="msg-timestamp">
              {es.upload.timestampLabel}
            </label>
            <input
              id="msg-timestamp"
              type="number"
              min={0}
              step={0.1}
              value={timestamp}
              onChange={(e) => setTimestamp(Math.max(0, Number(e.target.value)))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300" htmlFor="msg-duration">
              {es.upload.durationLabel}
            </label>
            <input
              id="msg-duration"
              type="number"
              min={0.5}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(Math.max(0.5, Number(e.target.value)))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300" htmlFor="msg-position">
              {es.upload.positionLabel}
            </label>
            <select
              id="msg-position"
              value={position}
              onChange={(e) => setPosition(e.target.value as 'top' | 'center' | 'bottom')}
              className={inputClass}
            >
              <option value="top">{es.upload.positionTop}</option>
              <option value="center">{es.upload.positionCenter}</option>
              <option value="bottom">{es.upload.positionBottom}</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-zinc-300" htmlFor="msg-content">
            {es.upload.contentLabel}
          </label>
          <textarea
            id="msg-content"
            rows={2}
            value={content}
            placeholder={es.upload.contentPlaceholder}
            onChange={(e) => setContent(e.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          {editingId ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleCancelEdit}>
              {es.upload.cancelEdit}
            </Button>
          ) : null}
          <Button type="submit" size="sm">
            {editingId ? es.upload.saveMessage : es.upload.addMessage}
          </Button>
        </div>
      </form>

      {/* Lista de mensajes en el timeline */}
      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Mensajes configurados ({messages.length})
        </h4>

        {messages.length === 0 ? (
          <p className="mt-3 text-xs italic text-zinc-500">{es.upload.emptyMessages}</p>
        ) : (
          <div className="mt-3 divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-950/30">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                      ⏱ {msg.timestamp}s
                    </span>
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      ⏳ {msg.duration}s
                    </span>
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      📍 {positionBadgeLabel(msg.position)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200">{msg.content}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(msg)}
                    className="h-8 px-2.5 text-xs"
                  >
                    {es.upload.editMessage}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeMessage(msg.id)}
                    className="h-8 px-2.5 text-xs"
                  >
                    {es.upload.deleteMessage}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
