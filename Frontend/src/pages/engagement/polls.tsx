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
import { ClipboardList, MessageCircle, Plus, Send } from "lucide-react";
import { surveyService } from "../../utils/api/admin.survey.api";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "../../components/ui/dialog";

// --- Main Component ---
export default function SurveysDashboard() {
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission
  const [newSurvey, setNewSurvey] = useState({
    title: "",
    type: "SURVEY", // Ensure valid values like 'Survey', 'Poll', etc.
    status: "ACTIVE",
    dueDate: "",
    questions: [{ text: "", type: "MULTIPLE_CHOICE_SINGLE", options: [""] }], // Default values
  });
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null); // Store selected survey details
  const [analysisData, setAnalysisData] = useState<any>(null);  // Store analysis data

  // Fetch Surveys Data (Employee/ Admin check)
  const loadSurveys = async () => {
    setLoading(true);
    try {
      const data: any = await surveyService.getSurveys(); // Assuming the API returns an object with 'surveys' field
      if (data && Array.isArray(data.surveys)) {
        setSurveys(data.surveys); // If the response has 'surveys' as an array, set it to surveys state
      } else {
        console.error(
          "API response is not an array or 'surveys' is missing",
          data
        );
        setSurveys([]); // Clear surveys if the data is not valid
      }
    } catch (error: any) {
      toast({
        title: "Failed to load surveys",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
      setSurveys([]); // Clear surveys in case of an error
    } finally {
      setLoading(false);
    }
  };

  // Fetch Survey Analysis Data when a survey is selected
  const loadSurveyAnalysis = async (surveyId: string) => {
    try {
      const data = await surveyService.getSurveyAnalysis(surveyId);
      setAnalysisData(data); // Store the analysis data
    } catch (error: any) {
      toast({
        title: "Failed to load survey analysis",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((survey) => survey.status === "ACTIVE");
  }, [surveys]);

  // Handle Survey Status Style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700 border-green-300";
      case "DRAFT":
        return "bg-gray-100 text-gray-600 border-gray-300";
      case "CLOSED":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // Create Survey API call
  const handleCreateSurvey = async () => {
    setIsSubmitting(true);
    try {
      await surveyService.createSurvey(newSurvey); // Calling the backend API
      toast({
        title: "Survey Created Successfully",
        description: "Your new survey has been created.",
        variant: "success",
      });
      loadSurveys(); // Reload surveys after creation
      setIsModalOpen(false); // Close modal after creation
    } catch (error: any) {
      toast({
        title: "Error Creating Survey",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle survey selection to view details
  const handleSurveySelect = async (surveyId: string) => {
    const survey = surveys.find((s) => s.id === surveyId);
    setSelectedSurvey(survey); // Set the selected survey details
    loadSurveyAnalysis(surveyId);  // Fetch the survey analysis data
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-green-600" />
            Polls & Survey Management
          </h1>
          <p className="text-gray-500 mt-1">
            Design, deploy, and analyze employee feedback forms.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700 shadow-md"
            onClick={() => setIsModalOpen(true)} // Open modal on button click
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Survey
          </Button>
        </div>
      </div>

      {/* Surveys Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 shadow-xl lg:col-span-3">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Active & Recent Feedback Campaigns
          </h2>

          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="w-[30%] text-gray-600">Survey Name</TableHead>
                <TableHead className="w-[15%] text-gray-600">Type</TableHead>
                <TableHead className="w-[30%] text-gray-600">Response Rate</TableHead>
                <TableHead className="w-[10%] text-gray-600">Status</TableHead>
                <TableHead className="w-[15%] text-gray-600 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSurveys.map((survey) => (
                <TableRow
                  key={survey.id}
                  className="hover:bg-green-50/50 transition-colors"
                >
                  <TableCell className="font-medium text-gray-700">
                    <Button
                      variant="link"
                      onClick={() => handleSurveySelect(survey.id)} // Click to analyze
                      className="text-blue-600"
                    >
                      {survey.name}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-medium text-indigo-600"
                    >
                      {survey.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{survey.responseCount}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-3 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(
                        survey.status
                      )}`}
                    >
                      {survey.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 border-indigo-300 hover:bg-indigo-100"
                      onClick={() => handleSurveySelect(survey.id)} // Click to analyze
                    >
                      Analyze
                    </Button>
                    {survey.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Survey Details Modal */}
      {selectedSurvey && analysisData && (
        <Dialog open={true} onOpenChange={() => setSelectedSurvey(null)}>
          <DialogContent className="w-full max-w-6xl">
            <DialogTitle>Survey Analysis - {analysisData.surveyTitle}</DialogTitle>
            <DialogDescription>
              This shows the detailed analysis of the selected survey.
            </DialogDescription>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Survey Title: {analysisData.surveyTitle}</h3>
              <p className="text-gray-700">Total Responses: {analysisData.totalResponses}</p>

              <h4 className="text-lg font-semibold text-gray-800">Analysis</h4>
              <div className="space-y-4">
                {analysisData.analysis && analysisData.analysis.length > 0 ? (
                  analysisData.analysis.map((question: any) => (
                    <div key={question.questionId} className="space-y-2">
                      <p className="text-gray-700 font-medium">{question.questionText}</p>
                      <p className="text-gray-600">Response Count: {question.responseCount}</p>
                      {question.averageRating !== null && (
                        <p className="text-gray-600">Average Rating: {question.averageRating}</p>
                      )}
                      {question.textResponses.length > 0 && (
                        <div>
                          <p className="text-gray-600">Text Responses:</p>
                          <ul className="list-disc pl-5">
                            {question.textResponses.map((response: string, idx: number) => (
                              <li key={idx}>{response}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No responses yet.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSurvey(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal for Creating Survey */}
      <Dialog open={isModalOpen} onOpenChange={() => setIsModalOpen(false)}>
        <DialogContent className="w-full max-w-6xl">
          <DialogTitle>Create New Survey</DialogTitle>
          <DialogDescription>
            Fill out the details to create a new survey.
          </DialogDescription>

          {/* Form layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Survey Title */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Survey Title</label>
              <input
                type="text"
                className="p-2 mt-2 border border-gray-300 rounded-md"
                value={newSurvey.title}
                onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })}
                placeholder="Enter survey title"
              />
            </div>

            {/* Survey Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Survey Type</label>
                <select
                  className="p-2 mt-2 border border-gray-300 rounded-md"
                  value={newSurvey.type}
                  onChange={(e) => setNewSurvey({ ...newSurvey, type: e.target.value })}
                >
                  <option value="SURVEY">Survey</option>
                  <option value="POLL">Poll</option>
                  <option value="FEEDBACK">Feedback</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  className="p-2 mt-2 border border-gray-300 rounded-md"
                  value={newSurvey.status}
                  onChange={(e) => setNewSurvey({ ...newSurvey, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                className="p-2 mt-2 border border-gray-300 rounded-md"
                value={newSurvey.dueDate}
                onChange={(e) => setNewSurvey({ ...newSurvey, dueDate: e.target.value })}
              />
            </div>

            {/* Dynamically added questions */}
            <div>
              <label className="text-sm font-medium text-gray-700">Questions</label>
              {newSurvey.questions.map((question, index) => (
                <div key={index} className="space-y-2 mb-4">
                  <input
                    type="text"
                    placeholder="Question Text"
                    value={question.text}
                    onChange={(e) => {
                      const updatedQuestions = [...newSurvey.questions];
                      updatedQuestions[index].text = e.target.value;
                      setNewSurvey({
                        ...newSurvey,
                        questions: updatedQuestions,
                      });
                    }}
                    className="w-full p-2 mt-2 border border-gray-300 rounded-md"
                  />
                  <div className="space-x-2 flex">
                    <input
                      type="text"
                      placeholder="Option 1"
                      value={question.options[0]}
                      onChange={(e) => {
                        const updatedQuestions = [...newSurvey.questions];
                        updatedQuestions[index].options[0] = e.target.value;
                        setNewSurvey({
                          ...newSurvey,
                          questions: updatedQuestions,
                        });
                      }}
                      className="p-2 border border-gray-300 rounded-md flex-1"
                    />
                    <input
                      type="text"
                      placeholder="Option 2"
                      value={question.options[1]}
                      onChange={(e) => {
                        const updatedQuestions = [...newSurvey.questions];
                        updatedQuestions[index].options[1] = e.target.value;
                        setNewSurvey({
                          ...newSurvey,
                          questions: updatedQuestions,
                        });
                      }}
                      className="p-2 border border-gray-300 rounded-md flex-1"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updatedQuestions = [...newSurvey.questions];
                      updatedQuestions.splice(index, 1);
                      setNewSurvey({
                        ...newSurvey,
                        questions: updatedQuestions,
                      });
                    }}
                  >
                    Remove Question
                  </Button>
                </div>
              ))}
              <Button
                variant="default"
                size="sm"
                onClick={() =>
                  setNewSurvey({
                    ...newSurvey,
                    questions: [
                      ...newSurvey.questions,
                      {
                        text: "",
                        type: "MULTIPLE_CHOICE_SINGLE",
                        options: ["", ""],
                      },
                    ],
                  })
                }
              >
                Add Question
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSurvey}
              className={`bg-green-600 hover:bg-green-700 ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
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
