import { motion } from 'framer-motion';
import type { TimelineMessage } from '../../types/project';

interface PopupMessageProps {
  message: TimelineMessage;
}

const positionClasses: Record<TimelineMessage['position'], string> = {
  top: 'top-20 left-1/2 -translate-x-1/2',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-28 left-1/2 -translate-x-1/2',
};

const slideOffset: Record<TimelineMessage['position'], number> = {
  top: -24,
  center: 0,
  bottom: 24,
};

/**
 * Mensaje emergente con animación de Framer Motion (RF-05).
 * - Animación de entrada y salida suave con fade y slide según su posición.
 * - Diseño de tarjeta oscura con glassmorphism (difuminado de fondo) y alto contraste.
 */
export function PopupMessage({ message }: PopupMessageProps) {
  const yOffset = slideOffset[message.position];

  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: yOffset, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: yOffset * 0.7, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
        mass: 0.8,
      }}
      className={`pointer-events-auto fixed z-40 w-11/12 max-w-sm px-4 ${positionClasses[message.position]}`}
    >
      <div className="rounded-2xl border border-white/20 bg-zinc-950/85 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {message.type === 'image' && message.content.startsWith('data:') ? (
          <img
            src={message.content}
            alt="Contenido emergente"
            className="mb-2 max-h-48 w-full rounded-xl object-contain"
          />
        ) : null}

        <p className="text-center text-sm font-medium leading-relaxed tracking-wide text-zinc-100 antialiased drop-shadow-sm">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
}
