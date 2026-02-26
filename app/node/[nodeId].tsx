import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { updateNodeProgress } from "../../lib/pathlab";
import type { MapNode, QuizQuestion, NodeAssessment } from "../../types/map";

export default function NodeDetailScreen() {
  const { nodeId, enrollmentId } = useLocalSearchParams<{
    nodeId: string;
    enrollmentId: string;
  }>();
  const [node, setNode] = useState<MapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadNode();
  }, [nodeId]);

  const loadNode = async () => {
    if (!nodeId) return;

    try {
      const { data } = await supabase
        .from("map_nodes")
        .select(`
          *,
          node_content(*),
          node_assessments(
            id,
            assessment_type,
            quiz_questions(*)
          )
        `)
        .eq("id", nodeId)
        .single();

      if (data) {
        setNode(data);
      }
    } catch (error) {
      console.error("Failed to load node:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!nodeId || completing) return;

    setCompleting(true);
    try {
      await updateNodeProgress({
        nodeId,
        status: "passed",
      });
      router.back();
    } catch (error) {
      console.error("Failed to complete node:", error);
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BFFF00" />
      </View>
    );
  }

  if (!node) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Content not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.nodeType}>{getTypeLabel(node.node_type)}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{node.title}</Text>

        {node.content?.description && (
          <Text style={styles.description}>{node.content.description}</Text>
        )}

        {renderNodeContent(node)}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
            completing && styles.ctaButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.ctaText}>Mark as Complete</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "video":
      return "Video";
    case "quiz":
      return "Quiz";
    case "text":
      return "Reading";
    case "file_upload":
      return "File Upload";
    case "project":
      return "Project";
    case "assessment":
      return "Assessment";
    default:
      return "Task";
  }
}

function renderNodeContent(node: MapNode) {
  switch (node.node_type) {
    case "text":
    case "learning":
      return <TextNodeContent node={node} />;
    case "video":
      return <VideoNodeContent node={node} />;
    case "quiz":
    case "assessment":
      return <QuizNodeContent node={node} />;
    case "file_upload":
      return <FileUploadNodeContent node={node} />;
    case "project":
      return <ProjectNodeContent node={node} />;
    case "end":
      return <EndNodeContent node={node} />;
    default:
      return <DefaultNodeContent node={node} />;
  }
}

// Text Node Renderer (for learning nodes)
function TextNodeContent({ node }: { node: MapNode }) {
  const instructions = node.content?.instructions || node.instructions;
  const legacyBody = node.content?.body;
  const nodeContent = node.node_content || [];
  const nodeAssessments = node.node_assessments || [];

  const hasContent =
    (instructions && instructions.trim() !== "") ||
    legacyBody ||
    nodeContent.length > 0 ||
    nodeAssessments.length > 0;

  return (
    <View style={styles.contentCard}>
      {instructions && instructions.trim() !== "" && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{instructions}</Text>
        </View>
      )}

      {/* Render content from node_content table */}
      {nodeContent.map((content, index) => (
        <View key={content.id || index} style={styles.nodeContentItem}>
          {(content.content_type === "text_with_images" || content.content_type === "text") &&
            content.content_body && (
              <View>
                {content.content_title && (
                  <Text style={styles.contentTitle}>{content.content_title}</Text>
                )}
                <Text style={styles.bodyText}>{content.content_body}</Text>
              </View>
            )}

          {content.content_type === "video" && content.content_url && (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>🎬</Text>
              <Text style={styles.videoTitle}>Video Content</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.videoButton,
                  pressed && styles.videoButtonPressed,
                ]}
                onPress={() => Linking.openURL(content.content_url!)}
              >
                <Text style={styles.videoButtonText}>Open Video</Text>
              </Pressable>
            </View>
          )}

          {content.content_type === "canva_slide" && content.content_url && (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>📊</Text>
              <Text style={styles.videoTitle}>Canva Slide</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.videoButton,
                  pressed && styles.videoButtonPressed,
                ]}
                onPress={() => Linking.openURL(content.content_url!)}
              >
                <Text style={styles.videoButtonText}>Open Slide</Text>
              </Pressable>
            </View>
          )}

          {content.content_type === "resource_link" && content.content_url && (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>🔗</Text>
              <Text style={styles.videoTitle}>Resource Link</Text>
              {content.content_body && (
                <Text style={styles.videoDuration}>{content.content_body}</Text>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.videoButton,
                  pressed && styles.videoButtonPressed,
                ]}
                onPress={() => Linking.openURL(content.content_url!)}
              >
                <Text style={styles.videoButtonText}>Open Resource</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      {/* Legacy body content */}
      {legacyBody && (
        <Text style={styles.bodyText}>{legacyBody}</Text>
      )}

      {/* Render assessments from node_assessments table */}
      {nodeAssessments.map((assessment) => {
        if (assessment.assessment_type === "quiz" && assessment.quiz_questions && assessment.quiz_questions.length > 0) {
          return (
            <LearningNodeQuiz
              key={assessment.id}
              assessment={assessment}
              nodeId={node.id}
            />
          );
        }
        if (assessment.assessment_type === "text_answer") {
          return (
            <TextAnswerAssessment
              key={assessment.id}
              assessment={assessment}
              nodeId={node.id}
            />
          );
        }
        return null;
      })}

      {!hasContent && (
        <Text style={styles.emptyText}>
          No content available yet. This learning node is ready to be edited.
        </Text>
      )}
    </View>
  );
}

// Video Node Renderer
function VideoNodeContent({ node }: { node: MapNode }) {
  const handleOpenVideo = () => {
    if (node.content?.video_url) {
      Linking.openURL(node.content.video_url);
    }
  };

  return (
    <View style={styles.contentCard}>
      {node.content?.instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{node.content.instructions}</Text>
        </View>
      )}

      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoIcon}>🎬</Text>
        <Text style={styles.videoTitle}>Video Content</Text>
        {node.content?.video_duration && (
          <Text style={styles.videoDuration}>
            Duration: {Math.floor(node.content.video_duration / 60)} min
          </Text>
        )}

        {node.content?.video_url ? (
          <Pressable
            style={({ pressed }) => [
              styles.videoButton,
              pressed && styles.videoButtonPressed,
            ]}
            onPress={handleOpenVideo}
          >
            <Text style={styles.videoButtonText}>Open Video</Text>
          </Pressable>
        ) : (
          <Text style={styles.noVideoText}>Video URL not available</Text>
        )}
      </View>
    </View>
  );
}

// Quiz Node Renderer
function QuizNodeContent({ node }: { node: MapNode }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = node.content?.questions || [];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (q.type === "multiple_choice") {
        const correctOption = q.options?.find((opt) => opt.is_correct);
        if (correctOption && userAnswer === correctOption.id) {
          correct++;
        }
      } else if (q.type === "true_false") {
        if (userAnswer === q.correct_answer) {
          correct++;
        }
      }
    });
    return questions.length > 0 ? (correct / questions.length) * 100 : 0;
  };

  const score = showResults ? calculateScore() : 0;
  const passingScore = node.content?.passing_score || 70;

  return (
    <View style={styles.contentCard}>
      {node.content?.instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{node.content.instructions}</Text>
        </View>
      )}

      {questions.map((question, index) => (
        <QuizQuestionCard
          key={question.id}
          question={question}
          index={index}
          selectedAnswer={answers[question.id]}
          onAnswerChange={handleAnswerChange}
          showResults={showResults}
        />
      ))}

      {questions.length === 0 && (
        <Text style={styles.emptyText}>No quiz questions available</Text>
      )}

      {questions.length > 0 && !showResults && (
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
          ]}
          onPress={handleSubmitQuiz}
        >
          <Text style={styles.submitButtonText}>Submit Quiz</Text>
        </Pressable>
      )}

      {showResults && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Quiz Results</Text>
          <Text style={styles.resultsScore}>
            Score: {score.toFixed(0)}% ({questions.filter((q) => {
              const userAnswer = answers[q.id];
              if (q.type === "multiple_choice") {
                const correctOption = q.options?.find((opt) => opt.is_correct);
                return correctOption && userAnswer === correctOption.id;
              }
              return userAnswer === q.correct_answer;
            }).length}/{questions.length} correct)
          </Text>
          <Text
            style={[
              styles.resultsStatus,
              score >= passingScore ? styles.resultsPassed : styles.resultsFailed,
            ]}
          >
            {score >= passingScore ? "✓ Passed" : "✗ Failed"}
          </Text>
        </View>
      )}
    </View>
  );
}

function QuizQuestionCard({
  question,
  index,
  selectedAnswer,
  onAnswerChange,
  showResults,
}: {
  question: QuizQuestion;
  index: number;
  selectedAnswer?: string;
  onAnswerChange: (questionId: string, answer: string) => void;
  showResults: boolean;
}) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionNumber}>Question {index + 1}</Text>
      <Text style={styles.questionText}>{question.question}</Text>

      {question.type === "multiple_choice" && question.options && (
        <View style={styles.optionsContainer}>
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.is_correct;
            const showCorrectness = showResults && isSelected;

            return (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  showCorrectness &&
                    (isCorrect ? styles.optionCorrect : styles.optionIncorrect),
                  pressed && styles.optionButtonPressed,
                ]}
                onPress={() => !showResults && onAnswerChange(question.id, option.id)}
                disabled={showResults}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {question.type === "true_false" && (
        <View style={styles.optionsContainer}>
          {["true", "false"].map((value) => {
            const isSelected = selectedAnswer === value;
            const isCorrect = question.correct_answer === value;
            const showCorrectness = showResults && isSelected;

            return (
              <Pressable
                key={value}
                style={({ pressed }) => [
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  showCorrectness &&
                    (isCorrect ? styles.optionCorrect : styles.optionIncorrect),
                  pressed && styles.optionButtonPressed,
                ]}
                onPress={() => !showResults && onAnswerChange(question.id, value)}
                disabled={showResults}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {value === "true" ? "True" : "False"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {showResults && question.explanation && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationLabel}>Explanation:</Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      )}
    </View>
  );
}

// File Upload Node Renderer
function FileUploadNodeContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      {node.content?.instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{node.content.instructions}</Text>
        </View>
      )}

      <View style={styles.uploadPlaceholder}>
        <Text style={styles.uploadIcon}>📎</Text>
        <Text style={styles.uploadTitle}>File Upload</Text>
        <Text style={styles.uploadDescription}>
          File upload functionality will be available soon
        </Text>
        {node.content?.allowed_types && (
          <Text style={styles.uploadHint}>
            Allowed types: {node.content.allowed_types.join(", ")}
          </Text>
        )}
      </View>
    </View>
  );
}

// Project Node Renderer
function ProjectNodeContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      {node.content?.instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{node.content.instructions}</Text>
        </View>
      )}

      {node.content?.deliverables && node.content.deliverables.length > 0 && (
        <View style={styles.deliverablesBox}>
          <Text style={styles.deliverablesLabel}>Deliverables:</Text>
          {node.content.deliverables.map((item, index) => (
            <View key={index} style={styles.deliverableItem}>
              <Text style={styles.deliverableBullet}>•</Text>
              <Text style={styles.deliverableText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {node.content?.rubric && (
        <View style={styles.rubricBox}>
          <Text style={styles.rubricLabel}>Grading Rubric:</Text>
          <Text style={styles.rubricText}>{node.content.rubric}</Text>
        </View>
      )}
    </View>
  );
}

// Text Answer Assessment (from database node_assessments)
function TextAnswerAssessment({
  assessment,
  nodeId,
}: {
  assessment: NodeAssessment;
  nodeId: string;
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    // You can add submission logic here if needed
  };

  return (
    <View style={styles.contentCard}>
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsLabel}>Reflection</Text>
        <Text style={styles.instructionsText}>
          Share your thoughts or answer the question below
        </Text>
      </View>

      <View style={styles.textAnswerBox}>
        <TextInput
          style={styles.textAnswerInput}
          placeholder="Type your answer here..."
          placeholderTextColor="#999"
          value={answer}
          onChangeText={setAnswer}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!submitted}
        />
      </View>

      {!submitted && (
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            answer.trim().length === 0 && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={answer.trim().length === 0}
        >
          <Text style={styles.submitButtonText}>Submit Answer</Text>
        </Pressable>
      )}

      {submitted && (
        <View style={styles.submittedBox}>
          <Text style={styles.submittedText}>✓ Answer submitted</Text>
        </View>
      )}
    </View>
  );
}

// Learning Node Quiz (from database node_assessments)
function LearningNodeQuiz({
  assessment,
  nodeId,
}: {
  assessment: NodeAssessment;
  nodeId: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);

  const questions = assessment.quiz_questions || [];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correct_option) {
        correct++;
      }
    });
    return questions.length > 0 ? (correct / questions.length) * 100 : 0;
  };

  const score = showResults ? calculateScore() : 0;
  const passingScore = 70;

  return (
    <View style={styles.contentCard}>
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsLabel}>Quiz</Text>
        <Text style={styles.instructionsText}>
          Answer the questions below to test your understanding
        </Text>
      </View>

      {questions.map((question, index) => (
        <View key={question.id} style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {index + 1}</Text>
          <Text style={styles.questionText}>{question.question_text}</Text>

          {question.options && (
            <View style={styles.optionsContainer}>
              {question.options.map((opt) => {
                const isSelected = answers[question.id] === opt.option;
                const isCorrect = opt.option === question.correct_option;
                const showCorrectness = showResults && isSelected;

                return (
                  <Pressable
                    key={opt.option}
                    style={({ pressed }) => [
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                      showCorrectness &&
                        (isCorrect ? styles.optionCorrect : styles.optionIncorrect),
                      pressed && styles.optionButtonPressed,
                    ]}
                    onPress={() =>
                      !showResults && handleAnswerChange(question.id, opt.option)
                    }
                    disabled={showResults}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {opt.option}. {opt.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ))}

      {questions.length === 0 && (
        <Text style={styles.emptyText}>No quiz questions available</Text>
      )}

      {questions.length > 0 && !showResults && (
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
          ]}
          onPress={handleSubmitQuiz}
        >
          <Text style={styles.submitButtonText}>Submit Quiz</Text>
        </Pressable>
      )}

      {showResults && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Quiz Results</Text>
          <Text style={styles.resultsScore}>
            Score: {score.toFixed(0)}% (
            {questions.filter((q) => answers[q.id] === q.correct_option).length}/
            {questions.length} correct)
          </Text>
          <Text
            style={[
              styles.resultsStatus,
              score >= passingScore ? styles.resultsPassed : styles.resultsFailed,
            ]}
          >
            {score >= passingScore ? "✓ Passed" : "✗ Failed"}
          </Text>
        </View>
      )}
    </View>
  );
}

// End Node Renderer
function EndNodeContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      <View style={styles.endCard}>
        <Text style={styles.endIcon}>🎉</Text>
        <Text style={styles.endTitle}>Congratulations!</Text>
        <Text style={styles.endMessage}>
          You've reached the end of today's tasks
        </Text>

        {node.content?.body && (
          <Text style={styles.endBody}>{node.content.body}</Text>
        )}
      </View>
    </View>
  );
}

// Default Node Renderer
function DefaultNodeContent({ node }: { node: MapNode }) {
  return (
    <View style={styles.contentCard}>
      {node.content?.instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{node.content.instructions}</Text>
        </View>
      )}

      <Text style={styles.emptyText}>
        Content viewer for {node.node_type} nodes coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFFF5",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#FDFFF5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#BFFF00",
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#666",
  },
  nodeType: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#BFFF00",
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    textTransform: "uppercase",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    lineHeight: 24,
    marginBottom: 24,
  },
  contentCard: {
    gap: 20,
  },
  nodeContentItem: {
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  instructionsBox: {
    backgroundColor: "#e8f5e0",
    padding: 16,
    borderRadius: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#333",
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    lineHeight: 28,
  },
  videoPlaceholder: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#eee",
    borderStyle: "dashed",
  },
  videoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    marginBottom: 16,
  },
  videoButton: {
    backgroundColor: "#BFFF00",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  videoButtonPressed: {
    backgroundColor: "#9FE800",
  },
  videoButtonText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  noVideoText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#999",
  },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  questionNumber: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#BFFF00",
    backgroundColor: "#111",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "500",
    color: "#111",
    marginBottom: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#eee",
  },
  optionButtonSelected: {
    backgroundColor: "#BFFF00",
    borderColor: "#BFFF00",
  },
  optionButtonPressed: {
    opacity: 0.7,
  },
  optionCorrect: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
  },
  optionIncorrect: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
  },
  optionText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#333",
  },
  optionTextSelected: {
    color: "#111",
    fontWeight: "600",
  },
  explanationBox: {
    backgroundColor: "#e8f5e0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  explanationLabel: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    fontFamily: "Orbit_400Regular",
    color: "#333",
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#BFFF00",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonPressed: {
    backgroundColor: "#9FE800",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
  resultsCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#eee",
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  resultsScore: {
    fontSize: 20,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  resultsStatus: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resultsPassed: {
    backgroundColor: "#d4edda",
    color: "#28a745",
  },
  resultsFailed: {
    backgroundColor: "#f8d7da",
    color: "#dc3545",
  },
  uploadPlaceholder: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#eee",
    borderStyle: "dashed",
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 18,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 12,
    fontFamily: "Orbit_400Regular",
    color: "#999",
  },
  deliverablesBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  deliverablesLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 12,
  },
  deliverableItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  deliverableBullet: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#BFFF00",
    marginRight: 8,
  },
  deliverableText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#333",
    lineHeight: 22,
  },
  rubricBox: {
    backgroundColor: "#e8f5e0",
    borderRadius: 12,
    padding: 16,
  },
  rubricLabel: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  rubricText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#333",
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#999",
    textAlign: "center",
    paddingVertical: 40,
  },
  textAnswerBox: {
    marginVertical: 8,
  },
  textAnswerInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#111",
    minHeight: 120,
  },
  submittedBox: {
    backgroundColor: "#d4edda",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submittedText: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#28a745",
  },
  endCard: {
    backgroundColor: "#e8f5e0",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  endIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  endTitle: {
    fontSize: 24,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  endMessage: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  endBody: {
    fontSize: 14,
    fontFamily: "Orbit_400Regular",
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#FDFFF5",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  ctaButton: {
    backgroundColor: "#BFFF00",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonPressed: {
    backgroundColor: "#9FE800",
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Orbit_400Regular",
    fontWeight: "600",
    color: "#111",
  },
});
