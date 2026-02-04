import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Upload, MessageCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogueCard } from "@/components/projects/DialogueCard";
import { CreateDialogueDialog } from "@/components/dialogues/CreateDialogueDialog";
import { useDialogueStore } from "@/stores/dialogueStore";
import { EmptyState } from "@/components/ui/empty-state";
import { isMobileDevice } from "@/lib/deviceDetection";

/**
 * Dialogues Section Component
 * Manages dialogues within a project
 */
export function DialoguesSection({ projectId, dialogues = [] }) {
  const { t } = useTranslation();
  const { importDialogue } = useDialogueStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importDialogue(projectId, file);
    } catch (error) {
      console.error("Failed to import dialogue:", error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <CreateDialogueDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
      />

      <div className="flex items-start justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {t("dialogues.title")} ({dialogues.length})
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mnteadlg"
            onChange={handleImport}
            className="hidden"
          />
          {/* Mobile: Dropdown Menu */}
          <div className="md:hidden flex gap-2 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t("common.import")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2 flex-1 rounded-full"
            >
              <Plus className="h-4 w-4" />
              {!isMobileDevice && t("dialogues.createNew")}
            </Button>
          </div>
          {/* Desktop: Full Buttons */}
          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t("common.import")}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("dialogues.createNew")}
            </Button>
          </div>
        </div>
      </div>

      {dialogues.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t("dialogues.noDialogues")}
          description={t("dialogues.createFirst")}
          action={
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("dialogues.createNew")}
            </Button>
          }
          tips={[
            "Dialogues are the backbone of your interactive narratives",
            "Use nodes to create branching conversations",
            "Connect nodes to create dialogue flow",
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dialogues.map((dialogue) => (
            <DialogueCard
              key={dialogue.id}
              dialogue={dialogue}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
