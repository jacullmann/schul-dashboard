import { ref, type MaybeRefOrGetter } from 'vue';
import { useEventListener } from '@vueuse/core';

const OFFICE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

/** Files a task accepts as attachments; some systems leave office files untyped. */
function isAttachment(file: File) {
  return (
    file.type.startsWith('image/') ||
    file.type === 'application/pdf' ||
    OFFICE_TYPES.has(file.type) ||
    /\.(docx|pptx|xlsx)$/i.test(file.name)
  );
}

const isFileDrag = (e: DragEvent) =>
  e.dataTransfer?.types.includes('Files') ?? false;

/**
 * Lets an element take attachments dragged onto it. Bind the returned
 * handlers to it, or pass `target` to have them registered on it.
 */
export function useFileDrop(
  onFiles: (files: File[]) => void,
  target?: MaybeRefOrGetter<EventTarget | null | undefined>,
) {
  const isDragOver = ref(false);
  // Entering a child fires dragleave on the parent, so only the last leave counts.
  let depth = 0;

  function dragenter(e: DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    depth++;
    isDragOver.value = true;
  }

  function dragover(e: DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  }

  function dragleave(e: DragEvent) {
    if (!isFileDrag(e)) return;
    depth--;
    if (depth === 0) isDragOver.value = false;
  }

  function drop(e: DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    depth = 0;
    isDragOver.value = false;
    const files = Array.from(e.dataTransfer?.files ?? []).filter(isAttachment);
    if (files.length) onFiles(files);
  }

  if (target) {
    useEventListener(target, 'dragenter', dragenter);
    useEventListener(target, 'dragover', dragover);
    useEventListener(target, 'dragleave', dragleave);
    useEventListener(target, 'drop', drop);
  }

  return { isDragOver, handlers: { dragenter, dragover, dragleave, drop } };
}
