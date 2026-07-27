import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MirrorMomentApp } from "./mirror-moment-app";

describe("MirrorMomentApp", () => {
  it("requires consent and a full-body photo before a plan can start", () => {
    render(<MirrorMomentApp />);

    const start = screen.getByRole("button", { name: "Create my confidence plan" });
    expect(start).toBeDisabled();

    fireEvent.click(screen.getByLabelText("I consent to processing these photos for this session."));
    expect(start).toBeDisabled();
    expect(screen.getByText("A full-body photo is required to create virtual looks.")).toBeInTheDocument();
  });
});
