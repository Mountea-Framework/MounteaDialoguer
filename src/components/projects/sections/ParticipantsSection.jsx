import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Download, Upload, Users, MoreVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateParticipantDialog } from "@/components/dialogs/CreateParticipantDialog";
import { ParticipantCard } from "@/components/projects/ParticipantCard";
import { useParticipantStore } from "@/stores/participantStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { isMobileDevice } from "@/lib/deviceDetection";

/**
 * Participants Section Component
 * Manages participants within a project
 */
export function ParticipantsSection({ projectId, participants = [] }) {
  const { t } = useTranslation();
  const { importParticipants, exportParticipants } = useParticipantStore();
  const { categories, loadCategories } = useCategoryStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const isMobile = isMobileDevice();
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  useEffect(() => {
    if (projectId) {
      loadCategories(projectId);
    }
  }, [projectId, loadCategories]);

  const { rootCategories, childrenByParent, participantsByCategory, unmatchedParticipants } = useMemo(() => {
    const map = new Map();
    categories.forEach((category) => {
      const parentId = category.parentCategoryId || null;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId).push(category);
    });
    map.forEach((children) => {
      children.sort((a, b) => a.name.localeCompare(b.name));
    });

    const nameToCategory = new Map();
    categories.forEach((category) => {
      if (!nameToCategory.has(category.name)) {
        nameToCategory.set(category.name, category);
      }
    });

    const participantsByCategoryName = new Map();
    const unmatched = [];

    participants.forEach((participant) => {
      const category = nameToCategory.get(participant.category);
      if (!category) {
        unmatched.push(participant);
        return;
      }
      if (!participantsByCategoryName.has(category.id)) {
        participantsByCategoryName.set(category.id, []);
      }
      participantsByCategoryName.get(category.id).push(participant);
    });

    participantsByCategoryName.forEach((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name));
    });

    return {
      rootCategories: (map.get(null) || []).slice().sort((a, b) => a.name.localeCompare(b.name)),
      childrenByParent: map,
      participantsByCategory: participantsByCategoryName,
      unmatchedParticipants: unmatched.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [categories, participants]);

  const toggleCategory = (categoryId) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const hasParticipantsInSubtree = (categoryId) => {
    if (participantsByCategory.has(categoryId)) return true;
    const children = childrenByParent.get(categoryId) || [];
    return children.some((child) => hasParticipantsInSubtree(child.id));
  };

  const renderCategoryNode = (category) => {
    const children = (childrenByParent.get(category.id) || []).filter((child) =>
      hasParticipantsInSubtree(child.id)
    );
    const categoryParticipants = participantsByCategory.get(category.id) || [];
    if (children.length === 0 && categoryParticipants.length === 0) return null;

    const isCollapsed = collapsedCategories.has(category.id);

    return (
      <div key={category.id} className="border border-border rounded-lg overflow-hidden bg-card">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => toggleCategory(category.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-semibold truncate">{category.name}</span>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-4 pt-4 space-y-5 border-t border-border">
            {categoryParticipants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryParticipants.map((participant) => (
                  <ParticipantCard key={participant.id} participant={participant} />
                ))}
              </div>
            )}

            {children.length > 0 && (
              <div className="space-y-5 pl-4 -ml-4 border-l border-border/60">
                {children.map((child) => renderCategoryNode(child))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleExport = async () => {
    try {
      const data = await exportParticipants(projectId);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `participants-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export participants:", error);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importParticipants(projectId, Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error("Failed to import participants:", error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            {t("participants.title")} ({participants.length})
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("participants.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
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
                <DropdownMenuItem
                  onClick={handleExport}
                  disabled={participants.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("common.export")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2 flex-1 rounded-full"
            >
              <Plus className="h-4 w-4" />
              {!isMobile && t("participants.addNew")}
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
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={participants.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {t("common.export")}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("participants.addNew")}
            </Button>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      {participants.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t("participants.noParticipants")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {t("participants.noParticipantsDescription")}
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("participants.addNew")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {rootCategories.map((category) => renderCategoryNode(category))}
          {unmatchedParticipants.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="flex items-center justify-between p-3">
                <span className="text-sm font-semibold text-muted-foreground">Uncategorized</span>
              </div>
              <div className="p-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unmatchedParticipants.map((participant) => (
                    <ParticipantCard key={participant.id} participant={participant} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <CreateParticipantDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
