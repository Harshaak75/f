import React, { useEffect, useState, useMemo } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useToast } from "../../hooks/use-toast";
import { ClipboardList, MessageCircle, Plus } from "lucide-react";
import { surveyService } from "../../utils/api/admin.survey.api";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "../../components/ui/dialog";

/* --------------------------------------------
   Question types allowed per survey type
--------------------------------------------- */
const QUESTION_TYPES_BY_SURVEY: Record<string, string[]> = {
  SURVEY: ["MULTIPLE_CHOICE_SINGLE", "RATING_5", "TEXT"],
  POLL: ["MULTIPLE_CHOICE_SINGLE"],
  FEEDBACK: ["TEXT", "RATING_5"],
};

export default function SurveysDashboard() {
  const { toast } = useToast();

  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const [newSurvey, setNewSurvey] = useState({
    title: "",
    type: "SURVEY",
    status: "ACTIVE",
    dueDate: "",
    questions: [
      {
        text: "",
        type: "MULTIPLE_CHOICE_SINGLE",
        options: ["", ""],
      },
    ],
  });

  /* --------------------------------------------
     Fetch surveys
  --------------------------------------------- */
  const loadSurveys = async () => {
    setLoading(true);
    try {
      const data: any = await surveyService.getSurveys();
      setSurveys(Array.isArray(data?.surveys) ? data.surveys : []);
    } catch (e: any) {
      toast({
        title: "Failed to load surveys",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const activeSurveys = useMemo(
    () => surveys.filter((s) => s.status === "ACTIVE"),
    [surveys]
  );

  /* --------------------------------------------
     Helpers
  --------------------------------------------- */
  const getStatusStyle = (status: string) => {
    if (status === "ACTIVE") return "bg-green-100 text-green-700";
    if (status === "DRAFT") return "bg-gray-100 text-gray-600";
    return "bg-red-100 text-red-700";
  };

  const calcResponseRate = (survey: any) => {
    if (!survey.expectedCount) return 0;
    return Math.round(
      (survey.responseCount / survey.expectedCount) * 100
    );
  };

  /* --------------------------------------------
     Create Survey
  --------------------------------------------- */
  const handleCreateSurvey = async () => {
    setIsSubmitting(true);
    try {
      await surveyService.createSurvey(newSurvey);
      toast({ title: "Survey created successfully" });
      setIsModalOpen(false);
      loadSurveys();
    } catch (e: any) {
      toast({
        title: "Failed to create survey",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------------------------------------------
     Analysis
  --------------------------------------------- */
  const handleAnalyze = async (surveyId: string) => {
    const survey = surveys.find((s) => s.id === surveyId);
    setSelectedSurvey(survey);
    const analysis = await surveyService.getSurveyAnalysis(surveyId);
    setAnalysisData(analysis);
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold flex gap-2">
            <ClipboardList className="text-green-600" /> Surveys
          </h1>
          <p className="text-gray-500">
            Manage employee feedback & polls
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Survey
        </Button>
      </div>

      {/* Table */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Survey</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Response Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {activeSurveys.map((survey) => {
              const rate = calcResponseRate(survey);
              return (
                <TableRow key={survey.id}>
                  <TableCell className="font-medium">
                    {survey.name}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline">{survey.type}</Badge>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm font-medium">{rate}%</div>
                    <div className="text-xs text-muted-foreground">
                      {survey.responseCount} / {survey.expectedCount}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusStyle(
                        survey.status
                      )}`}
                    >
                      {survey.status}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAnalyze(survey.id)}
                    >
                      Analyze
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE SURVEY MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogTitle>Create Survey</DialogTitle>
          <DialogDescription>
            Configure questions dynamically
          </DialogDescription>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <input
              placeholder="Survey title"
              className="border p-2 rounded"
              value={newSurvey.title}
              onChange={(e) =>
                setNewSurvey({ ...newSurvey, title: e.target.value })
              }
            />

            <select
              className="border p-2 rounded"
              value={newSurvey.type}
              onChange={(e) =>
                setNewSurvey({
                  ...newSurvey,
                  type: e.target.value,
                  questions: [],
                })
              }
            >
              <option value="SURVEY">Survey</option>
              <option value="POLL">Poll</option>
              <option value="FEEDBACK">Feedback</option>
            </select>
          </div>

          {/* Questions */}
          <div className="mt-6 space-y-4">
            {newSurvey.questions.map((q, i) => (
              <div key={i} className="border p-4 rounded space-y-2">
                <input
                  className="w-full border p-2 rounded"
                  placeholder="Question"
                  value={q.text}
                  onChange={(e) => {
                    const qs = [...newSurvey.questions];
                    qs[i].text = e.target.value;
                    setNewSurvey({ ...newSurvey, questions: qs });
                  }}
                />

                <select
                  value={q.type}
                  onChange={(e) => {
                    const qs = [...newSurvey.questions];
                    qs[i].type = e.target.value;
                    qs[i].options =
                      e.target.value === "MULTIPLE_CHOICE_SINGLE"
                        ? ["", ""]
                        : [];
                    setNewSurvey({ ...newSurvey, questions: qs });
                  }}
                >
                  {QUESTION_TYPES_BY_SURVEY[newSurvey.type].map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </select>

                {q.type === "MULTIPLE_CHOICE_SINGLE" &&
                  q.options.map((opt, j) => (
                    <input
                      key={j}
                      className="border p-2 rounded w-full"
                      placeholder={`Option ${j + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const qs = [...newSurvey.questions];
                        qs[i].options[j] = e.target.value;
                        setNewSurvey({ ...newSurvey, questions: qs });
                      }}
                    />
                  ))}
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() =>
                setNewSurvey({
                  ...newSurvey,
                  questions: [
                    ...newSurvey.questions,
                    {
                      text: "",
                      type:
                        QUESTION_TYPES_BY_SURVEY[newSurvey.type][0],
                      options: ["", ""],
                    },
                  ],
                })
              }
            >
              Add Question
            </Button>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreateSurvey}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Survey"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
