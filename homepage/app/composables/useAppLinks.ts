export const useAppLinks = () => {
  const { appUrl } = useRuntimeConfig().public;

  return {
    login: `${appUrl}/login`,
    register: `${appUrl}/register`,
  };
};
