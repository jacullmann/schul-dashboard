export const useScrollSpy = (ids: readonly string[]) => {
  const activeId = ref(ids[0]);
  const isMounted = useMounted();
  const visible = new Set<string>();

  // On client-side navigation the page is set up before its DOM exists, so the
  // sections can only be looked up once it has mounted.
  useIntersectionObserver(
    () => (isMounted.value ? ids.map((id) => document.getElementById(id)) : []),
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }
      activeId.value = ids.find((id) => visible.has(id)) ?? activeId.value;
    },
    { rootMargin: '-20% 0px -55% 0px' },
  );

  return { activeId };
};
