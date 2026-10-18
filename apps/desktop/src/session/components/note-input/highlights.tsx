import { MeetingChatHighlights } from "./meeting-chat-highlights";
import { MeetingScreenGallery } from "./meeting-screen-gallery";

import { useMeetingChatRecords } from "~/stt/meeting-chat-records";
import { useMeetingScreenRecords } from "~/stt/meeting-screen-records";

export function HighlightsView({ sessionId }: { sessionId: string }) {
  const chatRecords = useMeetingChatRecords(sessionId);
  const screenRecords = useMeetingScreenRecords(sessionId);
  const hasEvidence = chatRecords.length > 0 || screenRecords.length > 0;

  return (
    <section
      aria-label="Highlights"
      data-interview-highlights
      className="mx-auto w-full max-w-3xl pb-6"
    >
      <header className="mb-3 px-1">
        <h1 className="text-foreground text-base font-semibold">Highlights</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review captured meeting chat and shared-screen evidence from this
          interview.
        </p>
      </header>

      {hasEvidence ? (
        <div className="flex flex-col">
          <MeetingScreenGallery sessionId={sessionId} />
          <MeetingChatHighlights sessionId={sessionId} />
        </div>
      ) : (
        <div
          data-highlights-empty
          className="border-border/70 bg-muted/30 rounded-xl border px-4 py-6 text-center"
        >
          <p className="text-foreground text-sm font-medium">
            No highlights captured yet
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Shared screens and meeting chat appear here when they are available
            in the captured interview.
          </p>
        </div>
      )}
    </section>
  );
}
