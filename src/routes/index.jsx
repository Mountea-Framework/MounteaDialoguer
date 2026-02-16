import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Autoplay from "embla-carousel-autoplay";
import {
  Plus,
  Search,
  FolderOpen,
  MessageCircle,
  HardDrive,
  Calendar,
  Cloud,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useDialogueStore } from "@/stores/dialogueStore";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { AppHeader } from "@/components/ui/app-header";
import { formatFileSize, formatDate } from "@/lib/dateUtils";
import { calculateDiskUsage } from "@/lib/storageUtils";
import { OnboardingTour, useOnboarding } from "@/components/ui/onboarding-tour";
import { EmptyState } from "@/components/ui/empty-state";
import { isMobileDevice } from "@/lib/deviceDetection";
import { useSyncStore } from "@/stores/syncStore";

export const Route = createFileRoute("/")({
  component: ProjectsDashboard,
});

// Dashboard Header Component
function DashboardHeader({ onNewProject, onSearch, searchQuery, onShowTour }) {
  const { t } = useTranslation();
  const { status: syncStatus, setLoginDialogOpen } = useSyncStore();

  const syncLabel =
    syncStatus === "connected"
      ? t("sync.status.connected")
      : syncStatus === "syncing"
      ? t("sync.status.syncing")
      : t("sync.status.disconnected");

  const syncIconClass =
    syncStatus === "connected"
      ? "text-emerald-500"
      : syncStatus === "syncing"
      ? "text-amber-500"
      : syncStatus === "error"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <AppHeader
      containerClassName="max-w-7xl mx-auto"
      leftClassName="hidden md:flex items-center gap-3 justify-between md:justify-start min-w-0"
      rightClassName={`${isMobileDevice() ? "w-full justify-between" : ""}`}
      left={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="hidden sm:block min-w-0">
            <h1 className="text-base lg:text-lg font-bold tracking-tight truncate">
              {t("app.title")}
            </h1>
            <p className="hidden xl:block text-xs text-muted-foreground">
              {t("app.subtitle")}
            </p>
          </div>
        </div>
      }
      right={
        <>
          <div
            className="relative flex-1 md:w-44 lg:w-64 md:flex-none hidden md:block"
            data-tour="search"
            data-header-mobile-hidden
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <LanguageSelector />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLoginDialogOpen(true)}
            className="rounded-full"
            aria-label={`${t("sync.title")} - ${syncLabel}`}
            title={`${t("sync.title")} - ${syncLabel}`}
          >
            <Cloud className={`h-4 w-4 ${syncIconClass}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowTour}
            className="rounded-full shrink-0 hidden lg:inline-flex"
            data-header-mobile-hidden
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            onClick={onNewProject}
            size="sm"
            className={`gap-1 md:inline-flex whitespace-nowrap ${isMobileDevice() ? "hidden" : ""}`}
            data-tour={`${isMobileDevice() ? "" : "create-project"}`}
            aria-label={t("projects.createNew")}
            data-header-mobile-hidden
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">
              {t("projects.createNew")}
            </span>
          </Button>
        </>
      }
    />
  );
}

// Metrics Cards Component
function MetricsCards({ projectCount, dialogueCount, diskUsage }) {
  const { t } = useTranslation();
  const [isDesktop, setIsDesktop] = useState(!isMobileDevice());
  const [carouselApi, setCarouselApi] = useState();
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const autoplayPlugin = useRef(
    Autoplay({
      delay: 2500,
      stopOnInteraction: false,
    }),
  );

  useEffect(() => {
    const updateViewportType = () => setIsDesktop(!isMobileDevice());
    updateViewportType();
    window.addEventListener("resize", updateViewportType);
    window.addEventListener("orientationchange", updateViewportType);
    window.addEventListener("device-override", updateViewportType);
    return () => {
      window.removeEventListener("resize", updateViewportType);
      window.removeEventListener("orientationchange", updateViewportType);
      window.removeEventListener("device-override", updateViewportType);
    };
  }, []);

  const isMobile = !isDesktop;

  useEffect(() => {
    if (!isMobile) {
      setActiveMetricIndex(0);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!carouselApi || !isMobile) return;

    const handleSelect = () => {
      setActiveMetricIndex(carouselApi.selectedScrollSnap());
    };

    handleSelect();
    carouselApi.on("select", handleSelect);
    carouselApi.on("reInit", handleSelect);

    return () => {
      carouselApi.off("select", handleSelect);
      carouselApi.off("reInit", handleSelect);
    };
  }, [carouselApi, isMobile]);

  const metricCards = [
    {
      id: "projects",
      label: t("projects.title"),
      value: projectCount,
      iconContainerClass: "bg-blue-50 dark:bg-blue-900/20",
      icon: <FolderOpen className="h-6 w-6 text-primary" />,
    },
    {
      id: "dialogues",
      label: t("dialogues.title"),
      value: dialogueCount,
      iconContainerClass: "bg-purple-50 dark:bg-purple-900/20",
      icon: (
        <MessageCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
      ),
    },
    {
      id: "disk",
      label: t("dashboard.diskUsage"),
      value: diskUsage,
      iconContainerClass: "bg-orange-50 dark:bg-orange-900/20",
      icon: <HardDrive className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
    },
  ];

  const renderMetricCard = (metric, compact = false) => (
    <Card key={metric.id}>
      <CardContent className={compact ? "p-5" : "p-6"}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
            <h3 className={`${compact ? "text-2xl" : "text-3xl"} font-bold mt-2`}>
              {metric.value}
            </h3>
          </div>
          <div
            className={`w-12 h-12 rounded-full ${metric.iconContainerClass} flex items-center justify-center`}
          >
            {metric.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <div className="relative">
        <Carousel
          opts={{ loop: true }}
          plugins={[autoplayPlugin.current]}
          setApi={setCarouselApi}
          className="w-full"
        >
          <CarouselContent className="-ml-1">
            {metricCards.map((metric) => (
              <CarouselItem key={metric.id} className="basis-full pl-1">
                {renderMetricCard(metric, true)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="mt-3 flex items-center justify-center gap-2">
          {metricCards.map((metric, metricIndex) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => carouselApi?.scrollTo(metricIndex)}
              className={`h-2 rounded-full transition-all ${
                activeMetricIndex === metricIndex
                  ? "w-5 bg-primary"
                  : "w-2 bg-muted-foreground/40"
              }`}
              aria-label={metric.label}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metricCards.map((metric) => renderMetricCard(metric))}
    </div>
  );
}

// Project Card Component
function ProjectCard({ project }) {
  const { t } = useTranslation();
  const { dialogues } = useDialogueStore();
  const projectDialogues = dialogues.filter((d) => d.projectId === project.id);

  // Random gradient colors for variety
  const gradients = [
    "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
    "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
    "from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20",
    "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
  ];
  const iconColors = [
    "text-blue-500 dark:text-blue-400",
    "text-purple-500 dark:text-purple-400",
    "text-orange-500 dark:text-orange-400",
    "text-green-500 dark:text-green-400",
  ];
  const patternColors = ["#3b82f6", "#9333ea", "#f97316", "#22c55e"];

  // Use project ID to consistently assign colors
  const colorIndex =
    parseInt(project.id.substring(0, 8), 16) % gradients.length;

  return (
    <Link to="/projects/$projectId" params={{ projectId: project.id }}>
      <Card className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all h-full min-h-[280px] flex flex-col overflow-hidden rounded-lg">
        <div
          className={`h-32 bg-gradient-to-br ${gradients[colorIndex]} flex items-center justify-center relative overflow-hidden rounded-t-lg`}
        >
          <div
            className="absolute inset-0 opacity-30 dark:opacity-20 bg-[radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:16px_16px]"
            style={{ color: patternColors[colorIndex] }}
          />
          <FolderOpen
            className={`h-12 w-12 ${iconColors[colorIndex]} opacity-80 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10`}
          />
          <div className="absolute top-3 right-3 text-xs text-muted-foreground flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full">
            <Calendar className="h-3 w-3" />
            {formatDate(project.createdAt)}
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
              {project.name}
            </h3>
            {project.version && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                v{project.version}
              </span>
            )}
          </div>

          {project.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}

          <div className="mt-auto pt-3 border-t flex items-center justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MessageCircle
                className={`h-3.5 w-3.5 group-hover:${iconColors[colorIndex].replace("text-", "text-")} transition-colors`}
              />
              <span className="font-medium">
                {projectDialogues.length}{" "}
                {projectDialogues.length === 1
                  ? t("dialogues.title").slice(0, -1)
                  : t("dialogues.title")}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MobileProjectsTable({
  projects,
  dialogueCountByProject,
  onOpenProject,
  onCreateProject,
}) {
  const { t } = useTranslation();

  return (
    <div className="md:hidden space-y-3" data-tour="projects-grid">
      <Button onClick={onCreateProject} className="w-full gap-2" size="sm">
        <Plus className="h-4 w-4" />
        {t("projects.createNew")}
      </Button>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[8rem]">{t("projects.projectName")}</TableHead>
              <TableHead className="min-w-[6.5rem]">{t("projects.created")}</TableHead>
              <TableHead className="w-[4.5rem] text-center">
                {t("dialogues.title")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow
                key={project.id}
                tabIndex={0}
                onClick={() => onOpenProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenProject(project.id);
                  }
                }}
                className="cursor-pointer select-none active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <TableCell className="py-4 font-semibold">
                  <span className="block max-w-[8rem] truncate">{project.name}</span>
                </TableCell>
                <TableCell className="py-4 text-muted-foreground whitespace-nowrap">
                  {formatDate(project.createdAt)}
                </TableCell>
                <TableCell className="py-4 text-center font-medium">
                  {dialogueCountByProject[project.id] || 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ProjectsDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projects, loadProjects, isLoading, createOnboardingExampleProject } =
    useProjectStore();
  const { dialogues, loadDialogues } = useDialogueStore();
  const { lastSyncedAt } = useSyncStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingExampleProject, setIsCreatingExampleProject] = useState(false);
  const [diskUsageBytes, setDiskUsageBytes] = useState(0);
  const { runTour, finishTour, resetTour } = useOnboarding("dashboard");

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!lastSyncedAt) return;
    loadProjects();
    loadDialogues();
  }, [lastSyncedAt, loadProjects, loadDialogues]);

  useEffect(() => {
    const loadDiskUsage = async () => {
      const usage = await calculateDiskUsage();
      setDiskUsageBytes(usage);
    };
    loadDiskUsage();
  }, [projects, dialogues]);

  const handleNewProject = () => {
    setIsCreateDialogOpen(true);
  };

  const handleOpenProject = (projectId) => {
    navigate({ to: "/projects/$projectId", params: { projectId } });
  };

  const handleCreateExampleProject = async () => {
    if (isCreatingExampleProject) return;

    setIsCreatingExampleProject(true);

    try {
      const result = await createOnboardingExampleProject();

      finishTour();
      await loadProjects();
      await loadDialogues();
      navigate({ to: "/projects/$projectId", params: { projectId: result.projectId } });
    } catch (error) {
      console.error("Error creating example project:", error);
    } finally {
      setIsCreatingExampleProject(false);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const dialogueCountByProject = useMemo(() => {
    return dialogues.reduce((accumulator, dialogue) => {
      accumulator[dialogue.projectId] = (accumulator[dialogue.projectId] || 0) + 1;
      return accumulator;
    }, {});
  }, [dialogues]);

  const totalDialogues = dialogues.length;
  const diskUsage = formatFileSize(diskUsageBytes);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 overflow-x-clip">
      <OnboardingTour
        run={runTour}
        onFinish={finishTour}
        tourType="dashboard"
      />

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <DashboardHeader
        onNewProject={handleNewProject}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onShowTour={resetTour}
      />

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <MetricsCards
          projectCount={projects.length}
          dialogueCount={totalDialogues}
          diskUsage={diskUsage}
        />

        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">
              {t("projects.recentProjects")}
            </h2>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={t("projects.noProjects")}
              description={t("projects.createFirst")}
              action={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button onClick={handleNewProject}>
                    <Plus className="h-4 w-4" />
                    {t("projects.createNew")}
                  </Button>
                  {projects.length === 0 && (
                    <Button
                      variant="outline"
                      onClick={handleCreateExampleProject}
                      disabled={isCreatingExampleProject}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isCreatingExampleProject
                        ? t("common.loading")
                        : t("tour.dashboard.exampleAction")}
                    </Button>
                  )}
                </div>
              }
              tips={[
                "Projects help organize your dialogues by game or story",
                "Each project can contain multiple dialogues",
                "Use the search bar to quickly find projects",
              ]}
            />
          ) : (
            <>
              <MobileProjectsTable
                projects={filteredProjects}
                dialogueCountByProject={dialogueCountByProject}
                onOpenProject={handleOpenProject}
                onCreateProject={handleNewProject}
              />

              <div
                className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                data-tour="projects-grid"
              >
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}

                <button
                  onClick={handleNewProject}
                  className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[280px] hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <span className="font-bold text-lg">
                    {t("projects.createNew")}
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">
                    {t("projects.createNewDescription")}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
