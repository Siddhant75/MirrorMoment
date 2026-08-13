export type RuntimeMode = "replay" | "live";

export type RuntimeInfo = {
  mode: RuntimeMode;
  label: "Recorded Judge Replay" | "Live YouCam";
  acceptsCustomPhotos: boolean;
};
