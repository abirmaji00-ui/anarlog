import { useLingui } from "@lingui/react/macro";

import { cn } from "@anlg/utils";
import { createEditorTabs } from "@anlg/utils/session";

export { createEditorTabs } from "@anlg/utils/session";

import { HeaderViewEnhanced } from "./header-enhanced";
import { HeaderViewRaw } from "./header-raw";
import { HeaderViewShared } from "./header-shared-note";
import { HeaderViewTranscript } from "./header-transcript";

import { FolderPicker } from "~/session/components/folder-picker";
import {
  useCanShowTranscript,
  useHasTranscript,
} from "~/session/components/shared";
import { useEnhancedNotes } from "~/session/hooks/useEnhancedNotes";
import { deleteEnhancedNote } from "~/session/queries";
import { useSessionSharedNoteIds } from "~/shared-notes/event-keys";
import { type EditorView } from "~/store/zustand/tabs/schema";
import { useListener } from "~/stt/contexts";

export function Header({ sessionId }: { sessionId: string }) {
  return <FolderPicker sessionId={sessionId} align="end" />;
}

export function SessionViewSwitcher({
  sessionId,
  editorTabs,
  currentTab,
  handleTabChange,
  isTranscribing = false,
  transcriptEditMode = false,
  onTranscriptEditModeChange,
  highlightsActive = false,
  onHighlightsViewChange,
}: {
  sessionId: string;
  editorTabs: EditorView[];
  currentTab: EditorView;
  handleTabChange: (view: EditorView) => void;
  isTranscribing?: boolean;
  transcriptEditMode?: boolean;
  onTranscriptEditModeChange?: (editMode: boolean) => void;
  highlightsActive?: boolean;
  onHighlightsViewChange?: (active: boolean) => void;
}) {
  const { t } = useLingui();
  const primaryEnhancedTabId = editorTabs.find(
    (view): view is Extract<EditorView, { type: "enhanced" }> =>
      view.type === "enhanced",
  )?.id;
  // Highlights is a UI-only view backed by the existing meeting capture records.
  // It deliberately does not become a persisted EditorView.
  const orderedViews: Array<EditorView | { type: "workspace-highlights" }> = [
    ...editorTabs.filter((view) => view.type === "enhanced"),
    ...editorTabs.filter((view) => view.type === "transcript"),
    { type: "workspace-highlights" },
    ...editorTabs.filter((view) => view.type === "raw"),
    ...editorTabs.filter((view) => view.type === "shared"),
    ...editorTabs.filter(
      (view) =>
        view.type !== "enhanced" &&
        view.type !== "transcript" &&
        view.type !== "raw" &&
        view.type !== "shared",
    ),
  ];

  const selectEditorView = (view: EditorView) => {
    onHighlightsViewChange?.(false);
    handleTabChange(view);
  };

  return (
    <div
      role="group"
      aria-label={t`Session note views`}
      data-tauri-drag-region="false"
      className={cn([
        "pointer-events-auto relative z-10 w-fit max-w-full shrink-0 overflow-visible",
        "bg-foreground/10 dark:bg-accent/55 rounded-pill flex h-7 items-center gap-[2px] p-[2px] [corner-shape:round]",
      ])}
    >
      {orderedViews.map((view) => {
        if (view.type === "workspace-highlights") {
          return (
            <button
              key="workspace-highlights"
              type="button"
              aria-label="Highlights"
              aria-current={highlightsActive ? "page" : undefined}
              aria-pressed={highlightsActive}
              data-workspace-view="highlights"
              onClick={() => onHighlightsViewChange?.(true)}
              className={cn([
                "rounded-pill flex h-6 shrink-0 items-center justify-center px-2 text-xs font-medium transition-colors select-none [corner-shape:round]",
                highlightsActive
                  ? "text-foreground dark:bg-accent dark:text-foreground bg-white shadow-xs dark:shadow-none"
                  : "text-muted-foreground/70 hover:bg-background/60 hover:text-foreground dark:hover:bg-accent/80 dark:hover:text-foreground",
              ])}
            >
              Highlights
            </button>
          );
        }

        if (view.type === "enhanced") {
          return (
            <HeaderViewEnhanced
              key={`enhanced-${view.id}`}
              sessionId={sessionId}
              enhancedNoteId={view.id}
              canRemove={view.id !== primaryEnhancedTabId}
              onRemove={
                view.id !== primaryEnhancedTabId
                  ? () => {
                      const originalIndex = editorTabs.findIndex((candidate) =>
                        sameEditorView(candidate, view),
                      );
                      const previousView =
                        originalIndex > 0
                          ? editorTabs[originalIndex - 1]
                          : undefined;
                      if (
                        currentTab.type === "enhanced" &&
                        currentTab.id === view.id &&
                        previousView
                      ) {
                        handleTabChange(previousView);
                      }

                      void deleteEnhancedNote(view.id).catch((error) => {
                        console.error(
                          "[session-header] failed to remove summary",
                          error,
                        );
                      });
                    }
                  : undefined
              }
              onSelectNote={(enhancedNoteId) =>
                handleTabChange({ type: "enhanced", id: enhancedNoteId })
              }
              isActive={
                !highlightsActive &&
                currentTab.type === "enhanced" &&
                currentTab.id === view.id
              }
              onClick={() => selectEditorView(view)}
            />
          );
        }

        if (view.type === "raw") {
          return (
            <HeaderViewRaw
              key={view.type}
              label="Notes"
              sessionId={sessionId}
              isActive={!highlightsActive && currentTab.type === view.type}
              standalone={false}
              onClick={() => selectEditorView(view)}
            />
          );
        }

        if (view.type === "transcript") {
          return (
            <HeaderViewTranscript
              key={view.type}
              sessionId={sessionId}
              isActive={!highlightsActive && currentTab.type === view.type}
              isTranscribing={isTranscribing}
              editMode={transcriptEditMode}
              onEditModeChange={onTranscriptEditModeChange}
              onClick={() => selectEditorView(view)}
            />
          );
        }

        if (view.type === "shared") {
          return (
            <HeaderViewShared
              key={`shared-${view.id}`}
              isActive={
                !highlightsActive &&
                currentTab.type === "shared" &&
                currentTab.id === view.id
              }
              onClick={() => selectEditorView(view)}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

export function useEditorTabs({
  audioExists = false,
  sessionId,
}: {
  audioExists?: boolean;
  sessionId: string;
}): EditorView[] {
  const canShowTranscript = useCanShowTranscript(sessionId, { audioExists });
  const hasTranscript = useHasTranscript(sessionId);
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const enhancedNoteIds = useEnhancedNotes(
    sessionId,
    hasTranscript && sessionMode === "inactive",
  );

  const sharedNoteIds = useSessionSharedNoteIds(sessionId);

  return createEditorTabs({
    enhancedNoteIds,
    canShowTranscript,
    sharedNoteIds,
  });
}

function sameEditorView(left: EditorView, right: EditorView): boolean {
  if (left.type !== right.type) {
    return false;
  }
  if (left.type === "enhanced" && right.type === "enhanced") {
    return left.id === right.id;
  }
  if (left.type === "shared" && right.type === "shared") {
    return left.id === right.id;
  }
  return true;
}
