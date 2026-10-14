import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HighlightsView } from "./highlights";

const hoisted = vi.hoisted(() => ({
  chatRecords: [] as unknown[],
  screenRecords: [] as unknown[],
}));

vi.mock("~/stt/meeting-chat-records", () => ({
  useMeetingChatRecords: () => hoisted.chatRecords,
}));

vi.mock("~/stt/meeting-screen-records", () => ({
  useMeetingScreenRecords: () => hoisted.screenRecords,
}));

vi.mock("./meeting-chat-highlights", () => ({
  MeetingChatHighlights: () => <div data-testid="meeting-chat-highlights" />,
}));

vi.mock("./meeting-screen-gallery", () => ({
  MeetingScreenGallery: () => <div data-testid="meeting-screen-gallery" />,
}));

describe("HighlightsView", () => {
  beforeEach(() => {
    hoisted.chatRecords = [];
    hoisted.screenRecords = [];
  });

  it("shows an honest empty state when no capture evidence exists", () => {
    render(<HighlightsView sessionId="session-1" />);

    expect(screen.getByRole("heading", { name: "Highlights" })).not.toBeNull();
    expect(screen.getByText("No highlights captured yet")).not.toBeNull();
    expect(screen.queryByTestId("meeting-chat-highlights")).toBeNull();
    expect(screen.queryByTestId("meeting-screen-gallery")).toBeNull();
  });

  it("shows the existing capture widgets when evidence exists", () => {
    hoisted.chatRecords = [{ id: "chat-1" }];

    render(<HighlightsView sessionId="session-1" />);

    expect(screen.getByTestId("meeting-chat-highlights")).not.toBeNull();
    expect(screen.getByTestId("meeting-screen-gallery")).not.toBeNull();
    expect(screen.queryByText("No highlights captured yet")).toBeNull();
  });
});
