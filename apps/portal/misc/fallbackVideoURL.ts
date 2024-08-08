export const fallbackVideoURL = async (url: string, fallbackURL: string) => {
  return fetch(url).then((response) => {
    if (response.status !== 404) {
      return url;
    }

    return fallbackURL;
  });
};
