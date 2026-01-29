import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useToast } from "../../hooks/use-toast";
import { employeeService } from "../../utils/api/EmployeeApi/employee.dashbaord.api";

export default function EmployeeSurvey() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [survey, setSurvey] = useState<any>(null);
  const [answers, setAnswers] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSurvey = async () => {
      try {
        const data = await employeeService.getSurveyById(id!);
        setSurvey(data);
      } catch (e: any) {
        toast({
          title: "Failed to load survey",
          description: e?.message,
          variant: "destructive",
        });
      }
    };

    loadSurvey();
  }, [id]);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const formattedAnswers = Object.entries(answers).map(
        ([questionId, value]: any) => ({
          questionId,
          ...(typeof value === "string" && { textAnswer: value }),
          ...(typeof value === "number" && { numberAnswer: value }),
          ...(Array.isArray(value) && { arrayAnswer: value }),
        })
      );

      await employeeService.submitSurvey(id!, {
        answers: formattedAnswers,
      });

      toast({
        title: "Survey submitted",
        description: "Thank you for your feedback!",
      });

      navigate("/employee/dashboard");
    } catch (e: any) {
      toast({
        title: "Submission failed",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!survey) return <p>Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{survey.title}</h1>

      {survey.questions.map((q: any) => (
        <Card key={q.id} className="p-4 space-y-2">
          <p className="font-medium">{q.text}</p>

          {/* TEXT */}
          {q.type === "TEXT" && (
            <input
              className="border p-2 w-full rounded-md"
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: e.target.value })
              }
            />
          )}

          {/* RATING */}
          {q.type === "RATING_5" && (
            <select
              className="border p-2 rounded-md"
              onChange={(e) =>
                setAnswers({ ...answers, [q.id]: Number(e.target.value) })
              }
            >
              <option value="">Select rating</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}

          {/* SINGLE CHOICE */}
          {q.type === "MULTIPLE_CHOICE_SINGLE" &&
            q.options.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  onChange={() =>
                    setAnswers({ ...answers, [q.id]: [opt] })
                  }
                />
                {opt}
              </label>
            ))}

          {/* MULTI CHOICE */}
          {q.type === "MULTIPLE_CHOICE_MULTI" &&
            q.options.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={opt}
                  onChange={(e) => {
                    const prev = answers[q.id] || [];
                    setAnswers({
                      ...answers,
                      [q.id]: e.target.checked
                        ? [...prev, opt]
                        : prev.filter((o: string) => o !== opt),
                    });
                  }}
                />
                {opt}
              </label>
            ))}
        </Card>
      ))}

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Submitting..." : "Submit Survey"}
      </Button>
    </div>
  );
}
