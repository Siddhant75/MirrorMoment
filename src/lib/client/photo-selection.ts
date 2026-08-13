export type ReplayPhotoSelection = {
  kind: "replay";
  url: string;
  name: string;
  contentType: "image/jpeg";
};

export type PhotoSelection = File | ReplayPhotoSelection | null;

export async function materializePhoto(
  selection: Exclude<PhotoSelection, null>,
  fetcher: typeof fetch = fetch,
) {
  if (selection instanceof File) return selection;

  const response = await fetcher(selection.url);
  if (!response.ok) {
    throw new Error("The bundled demo photo could not be loaded.");
  }
  return new File(
    [await response.blob()],
    selection.name,
    { type: selection.contentType },
  );
}
